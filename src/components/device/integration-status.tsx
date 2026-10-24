import type { IntegrationStatus } from '../../services/runtime-integration';
import { Label } from '../../ui/kit';

const sources={native:'平台入口 · 待平台验证',provided:'已装配 · 未联调',missing:'待提供适配'};
/** Development tools only. Contract presence is not hardware/product readiness. */
export function IntegrationStatusView({status}:{status:IntegrationStatus}){
  return <><Label>真实接入装配</Label><Label muted>{"HTTP 与设备仅使用真实通信"}</Label>
    <Label muted>{status.profile?`配置标识：${status.profile}`:'未选择真实接入配置'}</Label>
    {status.configurationIssues.map(issue=><Label muted key={issue}>{issue}</Label>)}
    {status.capabilities.map(item=><Label key={item.key} muted>{`${item.label}：${sources[item.source]}`}</Label>)}
    <Label muted>装配状态不代表产品支持或真实联调通过。</Label>
  </>;
}
