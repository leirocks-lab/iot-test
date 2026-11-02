import XCTest
@testable import Rowan

@MainActor final class HTTPSelfUnbindTests:XCTestCase {
  @MainActor private final class HTTP:HTTPGateway {
    var calls:[(String,String,[String:Any]?)]=[]
    var hook:(String,String,[String:Any]?) async throws -> Any = {_,_,_ in NSNull()}
    func perform(_ method:String,_ path:String,body:[String:Any]?,token:String?) async throws -> Any {
      if method=="POST" {return ["accessToken":"public-access","refreshToken":"public-refresh","userID":"public-user"]}
      calls.append((method,path,body));return try await hook(method,path,body)
    }
  }
  @MainActor private final class Storage:SessionStorage {func read() async throws -> Data?{nil};func write(_ data:Data?) async throws {}}
  private func fixture() async throws -> (AccountService,HTTP,HTTPSelfUnbindRepository) {
    let http=HTTP(),account=AccountService(http:http,storage:Storage());try await account.login(account:"public@example.test",pin:"fixture")
    return (account,http,HTTPSelfUnbindRepository(account:account,scope:DeviceMoreScope(accountRevision:account.revision,resourceID:"a/b ?",userID:"public-user",productID:"product")))
  }
  func testExactMore02RouteNoBodyAndNoRequiredData() async throws {
    let (_,http,repo)=try await fixture();try await repo.deleteSelf();let call=try XCTUnwrap(http.calls.first)
    XCTAssertEqual(call.0,"DELETE");XCTAssertEqual(call.1,"/api/app/devices/a%2Fb%20%3F/users/self");XCTAssertNil(call.2)
  }
  func testDelete401NeverRefreshesOrReplays() async throws {
    let (_,http,repo)=try await fixture();http.hook={_,_,_ in throw RowanFailure(code:401,message:"private")}
    do{try await repo.deleteSelf();XCTFail("Expected401")}catch{XCTAssertEqual((error as? RowanFailure)?.code,401)}
    XCTAssertEqual(http.calls.count,1);XCTAssertEqual(http.calls.first?.0,"DELETE")
  }
  func testStaleRevisionCannotUseNewAccountToken() async throws {
    let (account,http,repo)=try await fixture();try await account.login(account:"b@example.test",pin:"fixture")
    do{try await repo.deleteSelf();XCTFail("Old intent sent")}catch{XCTAssertEqual((error as? RowanFailure)?.code,499)};XCTAssertTrue(http.calls.isEmpty)
  }
  func testCompleteHomeMembershipUsesExactOpaqueIdentity() async throws {
    let (_,http,repo)=try await fixture();http.hook={_,path,_ in XCTAssertEqual(path,"/api/app/devices");return [["devices":[["device":["id":"a/b ?"]]]]]}
    let present=try await repo.isOwned();XCTAssertTrue(present)
    http.hook={_,_,_ in [] as [Any]};let absent=try await repo.isOwned();XCTAssertFalse(absent)
  }
  func testMalformedHomeNeverMeansAbsence() async throws {
    let (_,http,repo)=try await fixture()
    for value in [NSNull(),["unexpected":true],[["devices":[["missing":true]]]]] as [Any] {
      http.hook={_,_,_ in value};do{_=try await repo.isOwned();XCTFail("Malformed accepted")}catch{XCTAssertEqual((error as? RowanFailure)?.code,502)}
    }
  }
}
