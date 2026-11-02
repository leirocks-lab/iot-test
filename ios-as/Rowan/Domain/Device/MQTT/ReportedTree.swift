import Foundation

/// Last-writer-wins per path, including subtree replacement/deletion barriers.
/// Object patches merge; missing properties never erase cached fields.
final class ReportedTree {
  private final class Node {
    var objectVersion: Int64 = -1
    var replacementVersion: Int64 = -1
    var replacement = ShadowValue.null
    var children: [String: Node] = [:]
  }
  struct Observed {
    let value: ShadowValue?
    let version: Int64
  }
  private let root = Node()

  @discardableResult func apply(_ value: ShadowValue, version: Int64) -> Bool { apply(root, value: value, version: version) }
  private func apply(_ node: Node, value: ShadowValue, version: Int64) -> Bool {
    if case let .fields(fields) = value {
      var changed = false
      if version > node.objectVersion { node.objectVersion = version; changed = true }
      for (key, child) in fields {
        let next = node.children[key] ?? Node()
        node.children[key] = next
        changed = apply(next, value: child, version: version) || changed
      }
      return changed
    }
    guard version > node.replacementVersion else { return false }
    node.replacementVersion = version
    node.replacement = value
    return true
  }
  func snapshot() -> ShadowValue {
    if let value = resolve(root, ancestorFloor: -1).value, case .fields = value { return value }
    return .fields([:])
  }
  func at(_ path: ShadowPath) -> Observed {
    var node = root
    var floor: Int64 = -1
    for key in path {
      floor = max(floor, node.replacementVersion)
      guard let next = node.children[key] else { return Observed(value: nil, version: floor) }
      node = next
    }
    return resolve(node, ancestorFloor: floor)
  }
  private func resolve(_ node: Node, ancestorFloor: Int64) -> Observed {
    let floor = max(ancestorFloor, node.replacementVersion)
    let children = node.children.mapValues { resolve($0, ancestorFloor: floor) }.filter { $0.value.value != nil }
    if !children.isEmpty {
      return Observed(value: .fields(children.compactMapValues(\.value)), version: children.values.map(\.version).max() ?? floor)
    }
    if node.objectVersion > floor { return Observed(value: .fields([:]), version: node.objectVersion) }
    if node.replacementVersion > ancestorFloor {
      return Observed(value: node.replacement == .null ? nil : node.replacement, version: node.replacementVersion)
    }
    return Observed(value: nil, version: ancestorFloor)
  }
}
