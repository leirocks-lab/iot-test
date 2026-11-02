import Foundation

struct HomeDevice: Equatable {
  let id: String
  let nickname: String
  static func == (lhs: HomeDevice, rhs: HomeDevice) -> Bool {
    lhs.id.utf8.elementsEqual(rhs.id.utf8) && lhs.nickname == rhs.nickname
  }
}

struct HomeGroup: Equatable {
  let roomName: String?
  let devices: [HomeDevice]
  /// Unknown identity is not evidence of unassignment.
  var roomID: RoomID? = nil
}

@MainActor
protocol HomeRepository {
  func loadGroups(expectedRevision: Int) async throws -> [HomeGroup]
}


struct HomeRoomTab: Equatable { let id: RoomID; let name: String }
struct HomeRoomState: Equatable {
  var groups: [HomeGroup] = []
  var selectedRoomID: RoomID?
  var loaded = false
  var loading = false
  var errorCode: String?
  var sessionExpired = false
  var tabs: [HomeRoomTab] { groups.compactMap { group in
    guard let id = group.roomID else { return nil }; return HomeRoomTab(id: id, name: group.roomName ?? "")
  } }
  var visibleGroups: [HomeGroup] {
    guard let selectedRoomID else { return groups }; return groups.filter { $0.roomID == selectedRoomID }
  }
  var empty: Bool { loaded && visibleGroups.allSatisfy { $0.devices.isEmpty } }
}

/// Page-owned HOME-01 projection. Local tab inputs never mutate a device or dispatch a request.
@MainActor final class HomeReadGate {fileprivate let permit=AccountTransactionGate()}
@MainActor final class HomeReadScopes {
  private let authority:()->(Int,String)?
  private var revision:Int?,user:Data?,gate=HomeReadGate()
  init(authority:@escaping ()->(Int,String)?){self.authority=authority}
  func forRevision(_ expected:Int)->HomeReadGate? {
    guard let source=authority(),source.0==expected else{return nil}
    let identity=Data(source.1.utf8)
    if let revision,expected<revision{return nil}
    if revision==expected,user != identity{return nil}
    if revision != expected{revision=expected;user=identity;gate=HomeReadGate()}
    return gate
  }
}
@MainActor final class HomeReadCommit {
  fileprivate let generation:UInt64
  fileprivate let ownedIDs:[String]
  fileprivate init(_ generation:UInt64,_ groups:[HomeGroup]){self.generation=generation;ownedIDs=groups.flatMap(\.devices).map(\.id)}
}
@MainActor
final class HomeRoomTabs {
  private let repository:any HomeRepository,revision:Int,current:()->Bool
  // This is a separate pure FIFO permit instance, never the AccountService storage permit.
  private let actualRead:AccountTransactionGate
  private var generation:UInt64=0,closed=false,needsReloadOnAppear=false
  private var installed:HomeReadCommit?
  private(set) var state=HomeRoomState(){didSet{onChange?(state)}}
  var onChange:((HomeRoomState)->Void)?
  init(repository:any HomeRepository,expectedRevision:Int,current:@escaping ()->Bool,readGate:HomeReadGate?=nil){self.repository=repository;revision=expectedRevision;self.current=current;actualRead=(readGate ?? HomeReadGate()).permit}
  private func expire(){generation &+= 1;installed=nil;state=HomeRoomState(sessionExpired:true)}
  func accountChanged(){if !closed && !current(){expire()}}
  func select(_ id:RoomID?){guard !closed else{return};guard current() else{expire();return};if let id,!state.groups.contains(where:{$0.roomID==id}){return};state.selectedRoomID=id}
  func cancelLoad(){if state.loading || !state.loaded{needsReloadOnAppear=true};generation &+= 1;installed=nil;state.loading=false}
  func consumeReloadOnAppear()->Bool {guard !closed else{return false};let needed=needsReloadOnAppear;needsReloadOnAppear=false;return needed}
  func deviceForOpen(_ id:String)->HomeDevice? {
    guard !closed else{return nil};guard current() else{expire();return nil}
    return state.visibleGroups.flatMap(\.devices).first {$0.id.utf8.elementsEqual(id.utf8)}
  }
  func close(){closed=true;generation &+= 1;installed=nil;state=HomeRoomState();onChange=nil}
  func reload() async {_ = await reloadTracked(beforeRead:{})}
  func reloadTracked(beforeRead:()->Void) async -> HomeReadCommit? {
    do{try Task.checkCancellation()}catch{return nil}
    guard !closed else{return nil};guard current() else{expire();return nil}
    needsReloadOnAppear=false;installed=nil;generation &+= 1;let own=generation
    state.loading=true;state.errorCode=nil
    do {
      let result:HomeReadCommit? = try await actualRead.run {
        try Task.checkCancellation();guard !self.closed,own==self.generation else{return nil}
        guard self.current() else{self.expire();return nil};beforeRead()
        let groups=try await self.repository.loadGroups(expectedRevision:self.revision)
        try Task.checkCancellation();guard !self.closed,own==self.generation else{return nil}
        guard self.current() else{self.expire();return nil}
        let selected=self.state.selectedRoomID.flatMap {id in groups.contains {$0.roomID==id} ? id:nil}
        let receipt=HomeReadCommit(own,groups);self.installed=receipt
        self.state=HomeRoomState(groups:groups,selectedRoomID:selected,loaded:true);return receipt
      }
      return result
    }catch is CancellationError {
      guard !closed,own==generation else{return nil};if !current(){expire()}else{state.loading=false};return nil
    }catch {
      guard !closed,own==generation else{return nil};if !current(){expire()}else{state.loading=false;state.errorCode="read_failed"};return nil
    }
  }
  func whileInstalled(_ receipt:HomeReadCommit,_ work:([String])->Bool)->Bool {
    guard !closed,installed === receipt,receipt.generation==generation,current() else{return false};return work(receipt.ownedIDs)
  }
}


/// Purely local review receipt. It grants no write/binding permission and never crosses RN.
struct HomeSelectionReview: Equatable { let ticket: UInt64; let devices: [HomeDevice]; let pageEpoch: UInt64 }
struct HomeSelectionState: Equatable {
  var editing = false
  var selected: [HomeDevice] = []
  var loaded = false
  var loading = false
  var review: HomeSelectionReview?
  var errorCode: String?
  var sessionExpired = false
  func isSelected(_ id: String) -> Bool { selected.contains { $0.id.utf8.elementsEqual(id.utf8) } }
}

/// Page-local selection only. There is no HTTP/MQTT/mutation callback or second account state.
/// MORE-02 stays denied until native removal/journal/resource-cleanup integration exists.
@MainActor
final class HomeSelection {
  private let current: () -> Bool
  private var available: [HomeDevice] = []
  private var active = true
  private var closed = false
  private(set) var inputEpoch: UInt64 = 1
  private var nextReview: UInt64 = 0
  private(set) var state = HomeSelectionState() { didSet { if oldValue != state { onChange?(state) } } }
  var onChange: ((HomeSelectionState) -> Void)?
  init(current: @escaping () -> Bool) { self.current = current }
  private func expired() { inputEpoch &+= 1; available = []; state = HomeSelectionState(sessionExpired: true) }
  private func currentInput(_ epoch: UInt64) -> Bool {
    guard !closed, active, epoch == inputEpoch else { return false }
    guard current() else { expired(); return false }
    return state.loaded && !state.loading
  }
  func accountChanged() { if !closed && !current() { expired() } }
  func sync(_ home: HomeRoomState) {
    guard !closed, active else { return }
    guard current(), !home.sessionExpired else { expired(); return }
    guard home.loaded else { available = []; state = HomeSelectionState(loading: home.loading); return }
    available = home.visibleGroups.flatMap(\.devices)
    let old = state
    let byID = Dictionary(available.map { (Data($0.id.utf8), $0) }, uniquingKeysWith: { first, _ in first })
    let selected = old.selected.compactMap { byID[Data($0.id.utf8)] }
    let changed = selected != old.selected
    var review = old.review
    if home.loading || changed || review?.devices != selected || review?.pageEpoch != inputEpoch { review = nil }
    state = HomeSelectionState(editing: old.editing, selected: selected, loaded: true, loading: home.loading,
      review: review, errorCode: selected.count < old.selected.count ? "selection_changed" : (changed ? nil : old.errorCode))
  }
  @discardableResult func begin(_ id: String, epoch: UInt64) -> Bool {
    guard currentInput(epoch) else { return false }
    if state.editing { return toggleCurrent(id) }
    guard let device = available.first(where: { $0.id.utf8.elementsEqual(id.utf8) }) else { return false }
    state.editing = true; state.selected = [device]; state.review = nil; state.errorCode = nil; return true
  }
  @discardableResult func toggle(_ id: String, epoch: UInt64) -> Bool {
    guard currentInput(epoch), state.editing else { return false }; return toggleCurrent(id)
  }
  private func toggleCurrent(_ id: String) -> Bool {
    guard let device = available.first(where: { $0.id.utf8.elementsEqual(id.utf8) }) else { return false }
    if state.isSelected(id) { state.selected.removeAll { $0.id.utf8.elementsEqual(id.utf8) } }
    else { state.selected.append(device) }
    state.review = nil; state.errorCode = nil; return true
  }
  func requestReview(epoch: UInt64) -> HomeSelectionReview? {
    guard currentInput(epoch), state.editing, !state.selected.isEmpty else { return nil }
    nextReview &+= 1; let value = HomeSelectionReview(ticket: nextReview, devices: state.selected, pageEpoch: inputEpoch)
    state.review = value; state.errorCode = nil; return value
  }
  func cancelReview(_ ticket: UInt64) { if state.review?.ticket == ticket { state.review = nil } }
  /// Default-denied: no dispatch, no accepted/confirmed/unknown result and no per-item successes.
  @discardableResult func confirm(_ ticket: UInt64) -> Bool {
    guard currentInput(inputEpoch), let review = state.review, review.ticket == ticket,
          review.pageEpoch == inputEpoch, review.devices == state.selected else { return false }
    state.review = nil; state.errorCode = "removal_unavailable"; return false
  }
  func exit() { state.editing = false; state.selected = []; state.review = nil; state.errorCode = nil }
  func leave() { active = false; inputEpoch &+= 1; available = []; state = HomeSelectionState() }
  func appear() { if !closed && !active { active = true; inputEpoch &+= 1; if !current() { expired() } } }
  func close() { closed = true; active = false; inputEpoch &+= 1; available = []; state = HomeSelectionState(); onChange = nil }
}
