import XCTest
@testable import Rowan

@MainActor final class HTTPDeviceShareCodeRepositoryTests:XCTestCase {
  @MainActor private final class HTTP:HTTPGateway {
    var calls:[(String,String)]=[]
    var bodySeen:[String:Any]?
    var reply:() async throws -> Any = { ["deviceID":"a/b ?*","bindCode":"public-code"] }
    func perform(_ method:String,_ path:String,body:[String:Any]?,token:String?) async throws -> Any {
      calls.append((method,path))
      if method=="POST" || (method=="PATCH" && path=="/api/app/session") {return ["accessToken":"public-access","refreshToken":"public-refresh","userID":"public-user"]}
      bodySeen=body;return try await reply()
    }
  }
  @MainActor private final class Storage:SessionStorage {func read() async throws -> Data?{nil};func write(_ data:Data?) async throws {}}
  private func fixture(_ device:String="a/b ?*") async throws -> (AccountService,HTTP,HTTPDeviceShareCodeRepository) {
    let http=HTTP(),account=AccountService(http:http,storage:Storage());try await account.login(account:"public@example.test",pin:"fixture");http.calls=[]
    return (account,http,HTTPDeviceShareCodeRepository(account:account,scope:DeviceMoreScope(accountRevision:account.revision,resourceID:device,userID:"public-user",productID:"product")))
  }
  func testExplicitGenerationUsesExactEncodedGetWithoutBody() async throws {
    let (_,http,repo)=try await fixture();let code=try await repo.generate()
    XCTAssertEqual(http.calls.count,1);XCTAssertEqual(http.calls.first?.0,"GET");XCTAssertEqual(http.calls.first?.1,"/api/app/devices/a%2Fb%20%3F%2A/bindCode");XCTAssertNil(http.bodySeen);XCTAssertEqual(code.bindCode,"public-code")
  }
  func testGeneration401DoesNotRefreshOrReplay() async throws {
    let (_,http,repo)=try await fixture();http.reply={throw RowanFailure(code:401,message:"private")}
    do{_=try await repo.generate();XCTFail("Expected401")}catch{XCTAssertEqual((error as? RowanFailure)?.code,401)}
    XCTAssertEqual(http.calls.count,1);XCTAssertEqual(http.calls.first?.0,"GET")
  }
  func testOrdinaryReadStillRefreshesOnce() async throws {
    let (account,http,_)=try await fixture();var reads=0
    http.reply={reads+=1;if reads==1{throw RowanFailure(code:401,message:"private")};return [:] as [String:Any]}
    _=try await account.request("GET","/api/app/devices");XCTAssertEqual(http.calls.map(\.0),["GET","PATCH","GET"])
  }
  func testStaleAccountCannotGenerateWithANewToken() async throws {
    let (account,http,repo)=try await fixture();try await account.login(account:"other@example.test",pin:"fixture");http.calls=[]
    do{_=try await repo.generate();XCTFail("Old intent sent")}catch{XCTAssertEqual((error as? RowanFailure)?.code,499)};XCTAssertTrue(http.calls.isEmpty)
  }
  func testLateResponseAfterAccountChangeIsDiscarded() async throws {
    let (account,http,repo)=try await fixture();http.reply={try await account.login(account:"other@example.test",pin:"fixture");return ["deviceID":"a/b ?*","bindCode":"public-code"]}
    do{_=try await repo.generate();XCTFail("Late code accepted")}catch{XCTAssertEqual((error as? RowanFailure)?.code,499)}
  }
  func testMismatchedDeviceDoesNotExposeItsCode() async throws {
    let (_,http,repo)=try await fixture();http.reply={ ["deviceID":"other","bindCode":"public-code"] }
    do{_=try await repo.generate();XCTFail("Wrong device accepted")}catch{XCTAssertEqual((error as? RowanFailure)?.code,502)}
  }
  func testMalformedMissingOrNonStringCodeNeverBecomesSuccess() async throws {
    let (_,http,repo)=try await fixture()
    for raw in [NSNull(),[] as [Any],[:], ["deviceID":"a/b ?*"],["deviceID":"a/b ?*","bindCode":1],["deviceID":"a/b ?*","bindCode":""]] as [Any] {
      http.reply={raw};do{_=try await repo.generate();XCTFail("Malformed accepted")}catch{XCTAssertEqual((error as? RowanFailure)?.code,502)}
    }
  }
  func testInvalidScopeNeverSends() async throws {
    for id in [".","..","","bad\nvalue"] {let (_,http,repo)=try await fixture(id);do{_=try await repo.generate();XCTFail("Invalid scope sent")}catch{};XCTAssertTrue(http.calls.isEmpty)}
  }
  func testTimeoutDoesNotAutomaticallyGenerateAgain() async throws {
    let (_,http,repo)=try await fixture();http.reply={throw URLError(.timedOut)}
    do{_=try await repo.generate();XCTFail("Timeout hidden")}catch{};XCTAssertEqual(http.calls.count,1)
  }
  func testNativeCredentialDescriptionsAndReflectionAreRedacted() async throws {
    let (_,_,repo)=try await fixture();let code=try await repo.generate()
    XCTAssertFalse(String(describing:code).contains("public-code"));XCTAssertFalse(String(reflecting:code).contains("public-code"));XCTAssertEqual(Mirror(reflecting:code).children.count,1)
  }
}
