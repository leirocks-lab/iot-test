import UIKit

private final class RegionOption: NSObject {
  let code: String
  @objc let name: String
  init(code: String) { self.code = code; name = Locale.current.localizedString(forRegionCode: code) ?? code }
}

/// Real ISO countries/regions, localized/indexed by UIKit; no default or sample US rows.
@MainActor
final class RegionSelectionViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {
  private let selected: (String) -> Void
  private let currentCode: String?
  private let regions = Locale.isoRegionCodes.map(RegionOption.init(code:))
  private let collation = UILocalizedIndexedCollation.current()
  private var groups: [(title: String, rows: [RegionOption])] = []
  private let table = UITableView(frame: .zero, style: .insetGrouped)
  private let search = AccountTextField("请输入国家或地区名称", icon: "AuthSearch")
  private let notice = UIView()

  init(currentCode: String? = nil, selected: @escaping (String) -> Void) {
    self.currentCode = currentCode; self.selected = selected
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("Storyboard initialization is not used") }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "国家或地区"
    AccountDesign.navigation(navigationItem)
    view.backgroundColor = AccountDesign.background
    table.backgroundColor = AccountDesign.background
    table.dataSource = self; table.delegate = self
    table.separatorStyle = .none
    table.rowHeight = UITableView.automaticDimension; table.estimatedRowHeight = 46
    table.sectionHeaderTopPadding = 0
    table.sectionFooterHeight = 12
    table.sectionIndexColor = UIColor(white: 102 / 255, alpha: 1)
    table.sectionIndexBackgroundColor = .clear
    table.keyboardDismissMode = .interactive
    search.clearButtonMode = .whileEditing
    search.addTarget(self, action: #selector(filter), for: .editingChanged)
    let orange = UIColor(red: 238 / 255, green: 157 / 255, blue: 49 / 255, alpha: 1)
    notice.backgroundColor = orange.withAlphaComponent(0.1)
    let description = AccountDesign.label(13)
    let paragraph = NSMutableParagraphStyle()
    paragraph.minimumLineHeight = max(19, AccountDesign.font(13).lineHeight)
    description.attributedText = NSAttributedString(string: "国家或地区用于适用协议及注册，注册后变更请联系客服。",
      attributes: [.font: AccountDesign.font(13), .foregroundColor: orange, .paragraphStyle: paragraph])
    let close = UIButton(type: .system)
    close.setImage(UIImage(named: "AuthNoticeClose")?.withRenderingMode(.alwaysOriginal), for: .normal)
    close.accessibilityLabel = "关闭地区说明"
    close.addAction(UIAction { [weak self] _ in
      guard let self, let stack = notice.superview as? UIStackView else { return }
      stack.removeArrangedSubview(notice); notice.removeFromSuperview()
    }, for: .touchUpInside)
    let icon = UIImageView(image: UIImage(named: "AuthRegionNotice"))
    icon.contentMode = .scaleAspectFit
    icon.widthAnchor.constraint(equalToConstant: 16).isActive = true
    let line = UIStackView(arrangedSubviews: [icon, description, close])
    line.alignment = .center; line.spacing = 12; line.translatesAutoresizingMaskIntoConstraints = false
    notice.addSubview(line)
    NSLayoutConstraint.activate([line.topAnchor.constraint(equalTo: notice.topAnchor, constant: 8),
      line.bottomAnchor.constraint(equalTo: notice.bottomAnchor, constant: -8),
      line.leadingAnchor.constraint(equalTo: notice.leadingAnchor, constant: 16),
      line.trailingAnchor.constraint(equalTo: notice.trailingAnchor, constant: -12), close.widthAnchor.constraint(equalToConstant: 32)])
    let searchWrapper = UIView()
    search.translatesAutoresizingMaskIntoConstraints = false; searchWrapper.addSubview(search)
    NSLayoutConstraint.activate([search.leadingAnchor.constraint(equalTo: searchWrapper.leadingAnchor, constant: 16),
      search.trailingAnchor.constraint(equalTo: searchWrapper.trailingAnchor, constant: -22),
      search.topAnchor.constraint(equalTo: searchWrapper.topAnchor, constant: 10),
      search.bottomAnchor.constraint(equalTo: searchWrapper.bottomAnchor, constant: -4)])
    let content = UIStackView(arrangedSubviews: [notice, searchWrapper, table])
    content.axis = .vertical; content.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(content)
    NSLayoutConstraint.activate([content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      content.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
      content.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
      content.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)])
    filter()
  }
  @objc private func filter() {
    let query = search.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let matches = query.isEmpty ? regions : regions.filter { $0.name.localizedCaseInsensitiveContains(query) || $0.code.localizedCaseInsensitiveContains(query) }
    var sections: [Int: [RegionOption]] = [:]
    for item in matches {
      let index = collation.section(for: item, collationStringSelector: #selector(getter: RegionOption.name))
      sections[index, default: []].append(item)
    }
    groups = sections.keys.sorted().map { index in
      (title: collation.sectionTitles[index], rows: sections[index, default: []].sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending })
    }
    let empty = AccountDesign.label(14, centered: true)
    empty.text = matches.isEmpty ? "没有匹配的国家或地区" : nil
    table.backgroundView = matches.isEmpty ? empty : nil
    table.reloadData()
  }
  func numberOfSections(in tableView: UITableView) -> Int { groups.count }
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { groups[section].rows.count }
  func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? { groups[section].title }
  func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
    max(section == 0 ? 33 : 25, AccountDesign.font(12).lineHeight + 12)
  }
  func sectionIndexTitles(for tableView: UITableView) -> [String]? { (search.text ?? "").isEmpty ? groups.map { $0.title } : nil }
  func tableView(_ tableView: UITableView, sectionForSectionIndexTitle title: String, at index: Int) -> Int { index }
  func tableView(_ tableView: UITableView, willDisplayHeaderView view: UIView, forSection section: Int) {
    guard let header = view as? UITableViewHeaderFooterView else { return }
    header.textLabel?.font = AccountDesign.font(12)
    header.textLabel?.textColor = UIColor(white: 102 / 255, alpha: 1)
  }
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell: UITableViewCell
    if let reused = tableView.dequeueReusableCell(withIdentifier: "region") { cell = reused }
    else {
      cell = UITableViewCell(style: .default, reuseIdentifier: "region")
      cell.contentView.heightAnchor.constraint(greaterThanOrEqualToConstant: 46).isActive = true
    }
    let option = groups[indexPath.section].rows[indexPath.row]
    let current = option.code == currentCode
    cell.backgroundColor = .white
    cell.textLabel?.text = option.name + (current ? "（当前）" : "")
    cell.textLabel?.font = AccountDesign.font(16)
    cell.textLabel?.adjustsFontForContentSizeCategory = true
    cell.textLabel?.numberOfLines = 0
    cell.textLabel?.textColor = current ? AccountDesign.link : AccountDesign.ink
    cell.accessoryView = current ? UIImageView(image: UIImage(named: "AuthSelected")) : nil
    cell.accessibilityTraits = current ? [.button, .selected] : [.button]
    return cell
  }
  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    selected(groups[indexPath.section].rows[indexPath.row].code)
    navigationController?.popViewController(animated: true)
  }
}
