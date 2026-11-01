import React, {Component} from 'react'
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom'

import lanhu_tianjiashebeilanyaxin from './view/lanhu_tianjiashebeilanyaxin/index.jsx'
import lanhu_tianjiashebeilanyaweikaiqishezhi from './view/lanhu_tianjiashebeilanyaweikaiqishezhi/index.jsx'
import lanhu_chajianyeshebeishezhiwifixinxi from './view/lanhu_chajianyeshebeishezhiwifixinxi/index.jsx'
import lanhu_denglu from './view/lanhu_denglu/index.jsx'
import lanhu_denglushuruwancheng from './view/lanhu_denglushuruwancheng/index.jsx'
import lanhu_saoyisaoshebei from './view/lanhu_saoyisaoshebei/index.jsx'
import lanhu_tianjiashebeipeiwangchenggongshezhinicheng from './view/lanhu_tianjiashebeipeiwangchenggongshezhinicheng/index.jsx'
import lanhu_dengluwangjimimayouxiangcuowubeifen from './view/lanhu_dengluwangjimimayouxiangcuowubeifen/index.jsx'
import lanhu_zhucediquxuanzeqisousuguanjianci from './view/lanhu_zhucediquxuanzeqisousuguanjianci/index.jsx'
import lanhu_saoyisaowuxiaotishi from './view/lanhu_saoyisaowuxiaotishi/index.jsx'
import lanhu_shezhigerenxinxizhuxiao from './view/lanhu_shezhigerenxinxizhuxiao/index.jsx'
import lanhu_shezhiyuyan from './view/lanhu_shezhiyuyan/index.jsx'
import lanhu_tianjiashebeisaomiaozhongshanghua from './view/lanhu_tianjiashebeisaomiaozhongshanghua/index.jsx'
import lanhu_chajianyeshebeishezhishanchushebei from './view/lanhu_chajianyeshebeishezhishanchushebei/index.jsx'
import lanhu_shezhigerenxinxixiugaimima from './view/lanhu_shezhigerenxinxixiugaimima/index.jsx'
import lanhu_shebeitianjiachenggongtishi from './view/lanhu_shebeitianjiachenggongtishi/index.jsx'
import lanhu_zhuceyinsixieyiyueduwancheng from './view/lanhu_zhuceyinsixieyiyueduwancheng/index.jsx'
import lanhu_dengluwangjimimachenggongzhaohui from './view/lanhu_dengluwangjimimachenggongzhaohui/index.jsx'
import lanhu_dengluzhaohuimimayanzhengmafasongzhong from './view/lanhu_dengluzhaohuimimayanzhengmafasongzhong/index.jsx'
import lanhu_qietu from './view/lanhu_qietu/index.jsx'
import lanhu_shezhiwentifankuiwentileixingzhankaibeifen from './view/lanhu_shezhiwentifankuiwentileixingzhankaibeifen/index.jsx'
import lanhu_dengluzhaohuimimayanzhengmayanshuchujieshu from './view/lanhu_dengluzhaohuimimayanzhengmayanshuchujieshu/index.jsx'
import lanhu_quanjujiazai from './view/lanhu_quanjujiazai/index.jsx'
import lanhu_shezhiguanyu from './view/lanhu_shezhiguanyu/index.jsx'
import lanhu_dengluwangjimima from './view/lanhu_dengluwangjimima/index.jsx'
import lanhu_shebeiye from './view/lanhu_shebeiye/index.jsx'
import lanhu_tianjiashebeisaomiaoshixiaojieshushanghua from './view/lanhu_tianjiashebeisaomiaoshixiaojieshushanghua/index.jsx'
import lanhu_tianjiashebeisaomiaojieshu from './view/lanhu_tianjiashebeisaomiaojieshu/index.jsx'
import lanhu_jiuguishebeiye from './view/lanhu_jiuguishebeiye/index.jsx'
import lanhu_fangjianguanlibianji from './view/lanhu_fangjianguanlibianji/index.jsx'
import lanhu_shezhiwentifankuiyixuanchanpin from './view/lanhu_shezhiwentifankuiyixuanchanpin/index.jsx'
import lanhu_denglushuruwanchengmimacuowuhuozhanghaobucunzai from './view/lanhu_denglushuruwanchengmimacuowuhuozhanghaobucunzai/index.jsx'
import lanhu_zhuceyinsixieyidaojishi from './view/lanhu_zhuceyinsixieyidaojishi/index.jsx'
import lanhu_shezhiwentifankuiwentileixingzhankai from './view/lanhu_shezhiwentifankuiwentileixingzhankai/index.jsx'
import lanhu_zhuceyanzhengmayancuowudengdaidaojishijieshu from './view/lanhu_zhuceyanzhengmayancuowudengdaidaojishijieshu/index.jsx'
import lanhu_shebeiyechushiji from './view/lanhu_shebeiyechushiji/index.jsx'
import lanhu_shezhiwentifankuiyidafuzaicifankuibeifen from './view/lanhu_shezhiwentifankuiyidafuzaicifankuibeifen/index.jsx'
import lanhu_jiuguichajianyetongsuokai from './view/lanhu_jiuguichajianyetongsuokai/index.jsx'
import lanhu_tianjiashebeisaomiaojieshuyilianjieshurumima from './view/lanhu_tianjiashebeisaomiaojieshuyilianjieshurumima/index.jsx'
import lanhu_dengluwangjimimayouxiangcuowu from './view/lanhu_dengluwangjimimayouxiangcuowu/index.jsx'
import lanhu_shezhigerenxinxixiugaiyouxiangyishuruyanzhengma from './view/lanhu_shezhigerenxinxixiugaiyouxiangyishuruyanzhengma/index.jsx'
import lanhu_wuwangluo from './view/lanhu_wuwangluo/index.jsx'
import lanhu_wode from './view/lanhu_wode/index.jsx'
import lanhu_chajianyeshebeishezhimozugujianbanben from './view/lanhu_chajianyeshebeishezhimozugujianbanben/index.jsx'
import lanhu_dengluwangjimimashezhixinmima from './view/lanhu_dengluwangjimimashezhixinmima/index.jsx'
import lanhu_tianjiashebeisaomiaojieshulianjie5gwifidanchuangtishi from './view/lanhu_tianjiashebeisaomiaojieshulianjie5gwifidanchuangtishi/index.jsx'
import lanhu_shezhigerenxinxi from './view/lanhu_shezhigerenxinxi/index.jsx'
import lanhu_chajianyeshebeishezhimcugujianbanbenyishizuixinbanben from './view/lanhu_chajianyeshebeishezhimcugujianbanbenyishizuixinbanben/index.jsx'
import lanhu_jiuguichajianyeshanghua from './view/lanhu_jiuguichajianyeshanghua/index.jsx'
import lanhu_dengluchenggong from './view/lanhu_dengluchenggong/index.jsx'
import lanhu_chajianyeshebeizhongmingmingchenggong from './view/lanhu_chajianyeshebeizhongmingmingchenggong/index.jsx'
import lanhu_shezhichanpinshuomingshu from './view/lanhu_shezhichanpinshuomingshu/index.jsx'
import lanhu_shezhigerenxinxishezhixinmima from './view/lanhu_shezhigerenxinxishezhixinmima/index.jsx'
import lanhu_chajianyeshebeishezhishebeierweimafenxiang from './view/lanhu_chajianyeshebeishezhishebeierweimafenxiang/index.jsx'
import lanhu_tianjiashebeilanyalianjiezhong from './view/lanhu_tianjiashebeilanyalianjiezhong/index.jsx'
import lanhu_shezhiwentifankuitijiaochenggong from './view/lanhu_shezhiwentifankuitijiaochenggong/index.jsx'
import lanhu_shezhiwentifankuiyiyouwentiliebiao from './view/lanhu_shezhiwentifankuiyiyouwentiliebiao/index.jsx'
import lanhu_tianjiashebeisaomiaojieshubeifenshanghua from './view/lanhu_tianjiashebeisaomiaojieshubeifenshanghua/index.jsx'
import lanhu_shezhiwentifankui from './view/lanhu_shezhiwentifankui/index.jsx'
import lanhu_zhuceyanzhengmayanshuchujieshu from './view/lanhu_zhuceyanzhengmayanshuchujieshu/index.jsx'
import lanhu_dengluwangjimimashuruxinmima from './view/lanhu_dengluwangjimimashuruxinmima/index.jsx'
import lanhu_zhuceshuruwancheng from './view/lanhu_zhuceshuruwancheng/index.jsx'
import lanhu_dengluzhuceye from './view/lanhu_dengluzhuceye/index.jsx'
import lanhu_chajianyeshebeishezhimozugujianbanbenshengjiwancheng from './view/lanhu_chajianyeshebeishezhimozugujianbanbenshengjiwancheng/index.jsx'
import lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhong from './view/lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhong/index.jsx'
import lanhu_tianjiashebeisaomiaosaodaoshebei from './view/lanhu_tianjiashebeisaomiaosaodaoshebei/index.jsx'
import lanhu_zhucechenggong from './view/lanhu_zhucechenggong/index.jsx'
import lanhu_tianjiashebeipeiwangchenggongnichengshuruzhong from './view/lanhu_tianjiashebeipeiwangchenggongnichengshuruzhong/index.jsx'
import lanhu_chajianyeshebeishezhimozugujianbanbenyishizuixinbanben from './view/lanhu_chajianyeshebeishezhimozugujianbanbenyishizuixinbanben/index.jsx'
import lanhu_shouyetianjia from './view/lanhu_shouyetianjia/index.jsx'
import lanhu_tianjiashebeisaomiaoshibaishanghua from './view/lanhu_tianjiashebeisaomiaoshibaishanghua/index.jsx'
import lanhu_zhuceshurucuowutishi from './view/lanhu_zhuceshurucuowutishi/index.jsx'
import lanhu_tianjiashebeisaomiaoshibai from './view/lanhu_tianjiashebeisaomiaoshibai/index.jsx'
import lanhu_jiuguichajianshouyewanzheng from './view/lanhu_jiuguichajianshouyewanzheng/index.jsx'
import lanhu_tianjiashebeilanyaquanbuxianshi from './view/lanhu_tianjiashebeilanyaquanbuxianshi/index.jsx'
import lanhu_tianjiashebeisaomiaoshixiaoneifaxianshebeishanghua from './view/lanhu_tianjiashebeisaomiaoshixiaoneifaxianshebeishanghua/index.jsx'
import lanhu_shebeiyejiashiqishanghua from './view/lanhu_shebeiyejiashiqishanghua/index.jsx'
import lanhu_shezhigerenxinxinichengxiugai from './view/lanhu_shezhigerenxinxinichengxiugai/index.jsx'
import lanhu_shezhichanpinshuomingshuxiangqing from './view/lanhu_shezhichanpinshuomingshuxiangqing/index.jsx'
import lanhu_fangjianguanlibianjimingcheng from './view/lanhu_fangjianguanlibianjimingcheng/index.jsx'
import lanhu_shezhigerenxinxituichudenglu from './view/lanhu_shezhigerenxinxituichudenglu/index.jsx'
import lanhu_shezhiguanyuyinsizhengceguanli from './view/lanhu_shezhiguanyuyinsizhengceguanli/index.jsx'
import lanhu_jiuguichajianye from './view/lanhu_jiuguichajianye/index.jsx'
import lanhu_zhucediquxuanzeqi from './view/lanhu_zhucediquxuanzeqi/index.jsx'
import lanhu_shezhigerenxinxishuruxinmima from './view/lanhu_shezhigerenxinxishuruxinmima/index.jsx'
import lanhu_zhuce from './view/lanhu_zhuce/index.jsx'
import lanhu_tianjiashebeilanyatianjiashibai from './view/lanhu_tianjiashebeilanyatianjiashibai/index.jsx'
import lanhu_tianjiashebeisaomiaojieshuweilianjiewifi from './view/lanhu_tianjiashebeisaomiaojieshuweilianjiewifi/index.jsx'
import lanhu_tianjiashebeisaomiaozhongyoutuijianbanben from './view/lanhu_tianjiashebeisaomiaozhongyoutuijianbanben/index.jsx'
import lanhu_chajianyeshebeishezhizhongmingming from './view/lanhu_chajianyeshebeishezhizhongmingming/index.jsx'
import lanhu_tianjiashebeisaomiaojieshuyilianjie from './view/lanhu_tianjiashebeisaomiaojieshuyilianjie/index.jsx'
import lanhu_zhuceshuruwanchengyanzhengmafasongchenggong from './view/lanhu_zhuceshuruwanchengyanzhengmafasongchenggong/index.jsx'
import lanhu_shouye from './view/lanhu_shouye/index.jsx'
import lanhu_saoyisao from './view/lanhu_saoyisao/index.jsx'
import lanhu_chajianyeshebeishezhixuanzewendudanwei from './view/lanhu_chajianyeshebeishezhixuanzewendudanwei/index.jsx'
import lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhongbeifen from './view/lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhongbeifen/index.jsx'
import lanhu_shebeiyechushijiguanji from './view/lanhu_shebeiyechushijiguanji/index.jsx'
import lanhu_shebeiyeshiyongtongji from './view/lanhu_shebeiyeshiyongtongji/index.jsx'
import lanhu_shezhichangjianwenti from './view/lanhu_shezhichangjianwenti/index.jsx'
import lanhu_shezhigerenxinxiyiwanchengxiugai from './view/lanhu_shezhigerenxinxiyiwanchengxiugai/index.jsx'
import lanhu_jiuguichajianshouyewanzhenglixian from './view/lanhu_jiuguichajianshouyewanzhenglixian/index.jsx'
import lanhu_saoyisaojinxingzhong from './view/lanhu_saoyisaojinxingzhong/index.jsx'
import lanhu_shezhigerenxinxixiugaiyouxiangyifasongyanzhengma from './view/lanhu_shezhigerenxinxixiugaiyouxiangyifasongyanzhengma/index.jsx'
import lanhu_tianjiashebeipeiwangchenggongxuanzefangjian from './view/lanhu_tianjiashebeipeiwangchenggongxuanzefangjian/index.jsx'
import lanhu_chajianyeshebeishezhi from './view/lanhu_chajianyeshebeishezhi/index.jsx'
import lanhu_chajianyeshebeishezhimozugujianbanbenfaxianxinbanben from './view/lanhu_chajianyeshebeishezhimozugujianbanbenfaxianxinbanben/index.jsx'
import lanhu_shezhichangjianwentijiedatuwentongyong from './view/lanhu_shezhichangjianwentijiedatuwentongyong/index.jsx'
import lanhu_shebeiyechushijilixian from './view/lanhu_shebeiyechushijilixian/index.jsx'
import lanhu_tianjiashebei from './view/lanhu_tianjiashebei/index.jsx'
import lanhu_shezhiwentifankuiyidafuzaicifankui from './view/lanhu_shezhiwentifankuiyidafuzaicifankui/index.jsx'
import lanhu_shouye_1 from './view/lanhu_shouye_1/index.jsx'
import lanhu_shezhilianxiwomenfasongyoujian from './view/lanhu_shezhilianxiwomenfasongyoujian/index.jsx'
import lanhu_shebeiyechushijilixiantishi from './view/lanhu_shebeiyechushijilixiantishi/index.jsx'
import lanhu_fangjianguanlibianjishanchuchenggong from './view/lanhu_fangjianguanlibianjishanchuchenggong/index.jsx'
import lanhu_shezhilianxiwomen from './view/lanhu_shezhilianxiwomen/index.jsx'
import lanhu_shezhiwentifankuiyidafu from './view/lanhu_shezhiwentifankuiyidafu/index.jsx'
import lanhu_qidongye from './view/lanhu_qidongye/index.jsx'
import lanhu_shezhiwentifankuixinzengchanpinxuanze from './view/lanhu_shezhiwentifankuixinzengchanpinxuanze/index.jsx'
import lanhu_zhuceyanzhengmayancuowudaojishijieshujihuochongxinfasong from './view/lanhu_zhuceyanzhengmayancuowudaojishijieshujihuochongxinfasong/index.jsx'
import lanhu_tianjiashebeisaomiaojieshuweilianjiewifidanchuangtishi from './view/lanhu_tianjiashebeisaomiaojieshuweilianjiewifidanchuangtishi/index.jsx'
import lanhu_zhuceshuruwanchengyanzhengmafasongzhong from './view/lanhu_zhuceshuruwanchengyanzhengmafasongzhong/index.jsx'
import lanhu_shezhiwentifankuiwentileixingzhankai_1 from './view/lanhu_shezhiwentifankuiwentileixingzhankai_1/index.jsx'
import lanhu_fangjianguanli from './view/lanhu_fangjianguanli/index.jsx'
import lanhu_tianjiashebeilanyachushizhuangtai from './view/lanhu_tianjiashebeilanyachushizhuangtai/index.jsx'
import lanhu_denglushurucuowutishi from './view/lanhu_denglushurucuowutishi/index.jsx'
import lanhu_shouyebeifenzhanganbianji from './view/lanhu_shouyebeifenzhanganbianji/index.jsx'
import lanhu_shezhigerenxinxinichengxiugaibeifen from './view/lanhu_shezhigerenxinxinichengxiugaibeifen/index.jsx'
import lanhu_chajianyeshebeishezhizhongmingmingshuru from './view/lanhu_chajianyeshebeishezhizhongmingmingshuru/index.jsx'
import lanhu_chajianyeshebeishezhixuanzefangjian from './view/lanhu_chajianyeshebeishezhixuanzefangjian/index.jsx'
import lanhu_fangjianguanlitianjiafangjianfanxian from './view/lanhu_fangjianguanlitianjiafangjianfanxian/index.jsx'
import lanhu_tianjiashebeisaomiaojieshulianjie5gwifitishi from './view/lanhu_tianjiashebeisaomiaojieshulianjie5gwifitishi/index.jsx'
import lanhu_tianjiashebeisaomiaojieshushoujiyilianjiewifi from './view/lanhu_tianjiashebeisaomiaojieshushoujiyilianjiewifi/index.jsx'
import lanhu_dengluzhuce_1 from './view/lanhu_dengluzhuce_1/index.jsx'
import lanhu_wode_2 from './view/lanhu_wode_2/index.jsx'
import lanhu_shezhiwentifankuiwentitianxiechakan from './view/lanhu_shezhiwentifankuiwentitianxiechakan/index.jsx'
import lanhu_wushebei from './view/lanhu_wushebei/index.jsx'
import lanhu_shebeiyejiashiqi from './view/lanhu_shebeiyejiashiqi/index.jsx'
import lanhu_tianjiashebeisaomiaozhong from './view/lanhu_tianjiashebeisaomiaozhong/index.jsx'
import lanhu_dengluzhaohuimima from './view/lanhu_dengluzhaohuimima/index.jsx'
import lanhu_jiuguichajianshouyewanzhengguanji from './view/lanhu_jiuguichajianshouyewanzhengguanji/index.jsx'
import lanhu_shebeiyechushijishanghuazhuangtai from './view/lanhu_shebeiyechushijishanghuazhuangtai/index.jsx'
import lanhu_fangjianguanlibeibianjishanchu from './view/lanhu_fangjianguanlibeibianjishanchu/index.jsx'
import lanhu_antarcticstar115jiuguishebeiyeuisheji260902 from './view/lanhu_antarcticstar115jiuguishebeiyeuisheji260902/index.jsx'
import lanhu_fangjianguanlibeitianjiafangjian from './view/lanhu_fangjianguanlibeitianjiafangjian/index.jsx'
import lanhu_dengluzhuce from './view/lanhu_dengluzhuce/index.jsx'
import lanhu_zhucediquxuanzeqichufasousuoguanbitishi from './view/lanhu_zhucediquxuanzeqichufasousuoguanbitishi/index.jsx'
import lanhu_shebeiyeshezhi from './view/lanhu_shebeiyeshezhi/index.jsx'
import lanhu_zhuceshuruwanchengyanzhengmafasongchenggongbeifen from './view/lanhu_zhuceshuruwanchengyanzhengmafasongchenggongbeifen/index.jsx'
import lanhu_shezhiwentifankuiwuneirong from './view/lanhu_shezhiwentifankuiwuneirong/index.jsx'
import lanhu_chajianyeshebeishezhizhongmingmingshuruchaozifutishi from './view/lanhu_chajianyeshebeishezhizhongmingmingshuruchaozifutishi/index.jsx'
import lanhu_shouyetianjiashebei from './view/lanhu_shouyetianjiashebei/index.jsx'
import lanhu_wode_1 from './view/lanhu_wode_1/index.jsx'
import lanhu_fangwushezhixialachuang from './view/lanhu_fangwushezhixialachuang/index.jsx'
import lanhu_shezhiwentifankuixinzeng from './view/lanhu_shezhiwentifankuixinzeng/index.jsx'
import lanhu_shezhigerenxinxinichengxiugaishuruxinyouxiang from './view/lanhu_shezhigerenxinxinichengxiugaishuruxinyouxiang/index.jsx'
import lanhu_shezhichangjianwentijiedatongyong from './view/lanhu_shezhichangjianwentijiedatongyong/index.jsx'
import lanhu_asdesignmobiletemplate0 from './view/lanhu_asdesignmobiletemplate0/index.jsx'

class App extends Component {
    render() {
        return (
            <Router>
                <div>
                    <Switch>
                        <Route exact path="/lanhu_tianjiashebeilanyaxin" component={lanhu_tianjiashebeilanyaxin} />
                        <Route exact path="/lanhu_tianjiashebeilanyaweikaiqishezhi" component={lanhu_tianjiashebeilanyaweikaiqishezhi} />
                        <Route exact path="/lanhu_chajianyeshebeishezhiwifixinxi" component={lanhu_chajianyeshebeishezhiwifixinxi} />
                        <Route exact path="/lanhu_denglu" component={lanhu_denglu} />
                        <Route exact path="/lanhu_denglushuruwancheng" component={lanhu_denglushuruwancheng} />
                        <Route exact path="/lanhu_saoyisaoshebei" component={lanhu_saoyisaoshebei} />
                        <Route exact path="/lanhu_tianjiashebeipeiwangchenggongshezhinicheng" component={lanhu_tianjiashebeipeiwangchenggongshezhinicheng} />
                        <Route exact path="/lanhu_dengluwangjimimayouxiangcuowubeifen" component={lanhu_dengluwangjimimayouxiangcuowubeifen} />
                        <Route exact path="/lanhu_zhucediquxuanzeqisousuguanjianci" component={lanhu_zhucediquxuanzeqisousuguanjianci} />
                        <Route exact path="/lanhu_saoyisaowuxiaotishi" component={lanhu_saoyisaowuxiaotishi} />
                        <Route exact path="/lanhu_shezhigerenxinxizhuxiao" component={lanhu_shezhigerenxinxizhuxiao} />
                        <Route exact path="/lanhu_shezhiyuyan" component={lanhu_shezhiyuyan} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaozhongshanghua" component={lanhu_tianjiashebeisaomiaozhongshanghua} />
                        <Route exact path="/lanhu_chajianyeshebeishezhishanchushebei" component={lanhu_chajianyeshebeishezhishanchushebei} />
                        <Route exact path="/lanhu_shezhigerenxinxixiugaimima" component={lanhu_shezhigerenxinxixiugaimima} />
                        <Route exact path="/lanhu_shebeitianjiachenggongtishi" component={lanhu_shebeitianjiachenggongtishi} />
                        <Route exact path="/lanhu_zhuceyinsixieyiyueduwancheng" component={lanhu_zhuceyinsixieyiyueduwancheng} />
                        <Route exact path="/lanhu_dengluwangjimimachenggongzhaohui" component={lanhu_dengluwangjimimachenggongzhaohui} />
                        <Route exact path="/lanhu_dengluzhaohuimimayanzhengmafasongzhong" component={lanhu_dengluzhaohuimimayanzhengmafasongzhong} />
                        <Route exact path="/lanhu_qietu" component={lanhu_qietu} />
                        <Route exact path="/lanhu_shezhiwentifankuiwentileixingzhankaibeifen" component={lanhu_shezhiwentifankuiwentileixingzhankaibeifen} />
                        <Route exact path="/lanhu_dengluzhaohuimimayanzhengmayanshuchujieshu" component={lanhu_dengluzhaohuimimayanzhengmayanshuchujieshu} />
                        <Route exact path="/lanhu_quanjujiazai" component={lanhu_quanjujiazai} />
                        <Route exact path="/lanhu_shezhiguanyu" component={lanhu_shezhiguanyu} />
                        <Route exact path="/lanhu_dengluwangjimima" component={lanhu_dengluwangjimima} />
                        <Route exact path="/lanhu_shebeiye" component={lanhu_shebeiye} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaoshixiaojieshushanghua" component={lanhu_tianjiashebeisaomiaoshixiaojieshushanghua} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshu" component={lanhu_tianjiashebeisaomiaojieshu} />
                        <Route exact path="/lanhu_jiuguishebeiye" component={lanhu_jiuguishebeiye} />
                        <Route exact path="/lanhu_fangjianguanlibianji" component={lanhu_fangjianguanlibianji} />
                        <Route exact path="/lanhu_shezhiwentifankuiyixuanchanpin" component={lanhu_shezhiwentifankuiyixuanchanpin} />
                        <Route exact path="/lanhu_denglushuruwanchengmimacuowuhuozhanghaobucunzai" component={lanhu_denglushuruwanchengmimacuowuhuozhanghaobucunzai} />
                        <Route exact path="/lanhu_zhuceyinsixieyidaojishi" component={lanhu_zhuceyinsixieyidaojishi} />
                        <Route exact path="/lanhu_shezhiwentifankuiwentileixingzhankai" component={lanhu_shezhiwentifankuiwentileixingzhankai} />
                        <Route exact path="/lanhu_zhuceyanzhengmayancuowudengdaidaojishijieshu" component={lanhu_zhuceyanzhengmayancuowudengdaidaojishijieshu} />
                        <Route exact path="/lanhu_shebeiyechushiji" component={lanhu_shebeiyechushiji} />
                        <Route exact path="/lanhu_shezhiwentifankuiyidafuzaicifankuibeifen" component={lanhu_shezhiwentifankuiyidafuzaicifankuibeifen} />
                        <Route exact path="/lanhu_jiuguichajianyetongsuokai" component={lanhu_jiuguichajianyetongsuokai} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshuyilianjieshurumima" component={lanhu_tianjiashebeisaomiaojieshuyilianjieshurumima} />
                        <Route exact path="/lanhu_dengluwangjimimayouxiangcuowu" component={lanhu_dengluwangjimimayouxiangcuowu} />
                        <Route exact path="/lanhu_shezhigerenxinxixiugaiyouxiangyishuruyanzhengma" component={lanhu_shezhigerenxinxixiugaiyouxiangyishuruyanzhengma} />
                        <Route exact path="/lanhu_wuwangluo" component={lanhu_wuwangluo} />
                        <Route exact path="/lanhu_wode" component={lanhu_wode} />
                        <Route exact path="/lanhu_chajianyeshebeishezhimozugujianbanben" component={lanhu_chajianyeshebeishezhimozugujianbanben} />
                        <Route exact path="/lanhu_dengluwangjimimashezhixinmima" component={lanhu_dengluwangjimimashezhixinmima} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshulianjie5gwifidanchuangtishi" component={lanhu_tianjiashebeisaomiaojieshulianjie5gwifidanchuangtishi} />
                        <Route exact path="/lanhu_shezhigerenxinxi" component={lanhu_shezhigerenxinxi} />
                        <Route exact path="/lanhu_chajianyeshebeishezhimcugujianbanbenyishizuixinbanben" component={lanhu_chajianyeshebeishezhimcugujianbanbenyishizuixinbanben} />
                        <Route exact path="/lanhu_jiuguichajianyeshanghua" component={lanhu_jiuguichajianyeshanghua} />
                        <Route exact path="/lanhu_dengluchenggong" component={lanhu_dengluchenggong} />
                        <Route exact path="/lanhu_chajianyeshebeizhongmingmingchenggong" component={lanhu_chajianyeshebeizhongmingmingchenggong} />
                        <Route exact path="/lanhu_shezhichanpinshuomingshu" component={lanhu_shezhichanpinshuomingshu} />
                        <Route exact path="/lanhu_shezhigerenxinxishezhixinmima" component={lanhu_shezhigerenxinxishezhixinmima} />
                        <Route exact path="/lanhu_chajianyeshebeishezhishebeierweimafenxiang" component={lanhu_chajianyeshebeishezhishebeierweimafenxiang} />
                        <Route exact path="/lanhu_tianjiashebeilanyalianjiezhong" component={lanhu_tianjiashebeilanyalianjiezhong} />
                        <Route exact path="/lanhu_shezhiwentifankuitijiaochenggong" component={lanhu_shezhiwentifankuitijiaochenggong} />
                        <Route exact path="/lanhu_shezhiwentifankuiyiyouwentiliebiao" component={lanhu_shezhiwentifankuiyiyouwentiliebiao} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshubeifenshanghua" component={lanhu_tianjiashebeisaomiaojieshubeifenshanghua} />
                        <Route exact path="/lanhu_shezhiwentifankui" component={lanhu_shezhiwentifankui} />
                        <Route exact path="/lanhu_zhuceyanzhengmayanshuchujieshu" component={lanhu_zhuceyanzhengmayanshuchujieshu} />
                        <Route exact path="/lanhu_dengluwangjimimashuruxinmima" component={lanhu_dengluwangjimimashuruxinmima} />
                        <Route exact path="/lanhu_zhuceshuruwancheng" component={lanhu_zhuceshuruwancheng} />
                        <Route exact path="/lanhu_dengluzhuceye" component={lanhu_dengluzhuceye} />
                        <Route exact path="/lanhu_chajianyeshebeishezhimozugujianbanbenshengjiwancheng" component={lanhu_chajianyeshebeishezhimozugujianbanbenshengjiwancheng} />
                        <Route exact path="/lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhong" component={lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhong} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaosaodaoshebei" component={lanhu_tianjiashebeisaomiaosaodaoshebei} />
                        <Route exact path="/lanhu_zhucechenggong" component={lanhu_zhucechenggong} />
                        <Route exact path="/lanhu_tianjiashebeipeiwangchenggongnichengshuruzhong" component={lanhu_tianjiashebeipeiwangchenggongnichengshuruzhong} />
                        <Route exact path="/lanhu_chajianyeshebeishezhimozugujianbanbenyishizuixinbanben" component={lanhu_chajianyeshebeishezhimozugujianbanbenyishizuixinbanben} />
                        <Route exact path="/lanhu_shouyetianjia" component={lanhu_shouyetianjia} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaoshibaishanghua" component={lanhu_tianjiashebeisaomiaoshibaishanghua} />
                        <Route exact path="/lanhu_zhuceshurucuowutishi" component={lanhu_zhuceshurucuowutishi} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaoshibai" component={lanhu_tianjiashebeisaomiaoshibai} />
                        <Route exact path="/lanhu_jiuguichajianshouyewanzheng" component={lanhu_jiuguichajianshouyewanzheng} />
                        <Route exact path="/lanhu_tianjiashebeilanyaquanbuxianshi" component={lanhu_tianjiashebeilanyaquanbuxianshi} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaoshixiaoneifaxianshebeishanghua" component={lanhu_tianjiashebeisaomiaoshixiaoneifaxianshebeishanghua} />
                        <Route exact path="/lanhu_shebeiyejiashiqishanghua" component={lanhu_shebeiyejiashiqishanghua} />
                        <Route exact path="/lanhu_shezhigerenxinxinichengxiugai" component={lanhu_shezhigerenxinxinichengxiugai} />
                        <Route exact path="/lanhu_shezhichanpinshuomingshuxiangqing" component={lanhu_shezhichanpinshuomingshuxiangqing} />
                        <Route exact path="/lanhu_fangjianguanlibianjimingcheng" component={lanhu_fangjianguanlibianjimingcheng} />
                        <Route exact path="/lanhu_shezhigerenxinxituichudenglu" component={lanhu_shezhigerenxinxituichudenglu} />
                        <Route exact path="/lanhu_shezhiguanyuyinsizhengceguanli" component={lanhu_shezhiguanyuyinsizhengceguanli} />
                        <Route exact path="/lanhu_jiuguichajianye" component={lanhu_jiuguichajianye} />
                        <Route exact path="/lanhu_zhucediquxuanzeqi" component={lanhu_zhucediquxuanzeqi} />
                        <Route exact path="/lanhu_shezhigerenxinxishuruxinmima" component={lanhu_shezhigerenxinxishuruxinmima} />
                        <Route exact path="/lanhu_zhuce" component={lanhu_zhuce} />
                        <Route exact path="/lanhu_tianjiashebeilanyatianjiashibai" component={lanhu_tianjiashebeilanyatianjiashibai} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshuweilianjiewifi" component={lanhu_tianjiashebeisaomiaojieshuweilianjiewifi} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaozhongyoutuijianbanben" component={lanhu_tianjiashebeisaomiaozhongyoutuijianbanben} />
                        <Route exact path="/lanhu_chajianyeshebeishezhizhongmingming" component={lanhu_chajianyeshebeishezhizhongmingming} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshuyilianjie" component={lanhu_tianjiashebeisaomiaojieshuyilianjie} />
                        <Route exact path="/lanhu_zhuceshuruwanchengyanzhengmafasongchenggong" component={lanhu_zhuceshuruwanchengyanzhengmafasongchenggong} />
                        <Route exact path="/lanhu_shouye" component={lanhu_shouye} />
                        <Route exact path="/lanhu_saoyisao" component={lanhu_saoyisao} />
                        <Route exact path="/lanhu_chajianyeshebeishezhixuanzewendudanwei" component={lanhu_chajianyeshebeishezhixuanzewendudanwei} />
                        <Route exact path="/lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhongbeifen" component={lanhu_tianjiashebeisuoyouxianshiwifipeiwanglianjiezhongbeifen} />
                        <Route exact path="/lanhu_shebeiyechushijiguanji" component={lanhu_shebeiyechushijiguanji} />
                        <Route exact path="/lanhu_shebeiyeshiyongtongji" component={lanhu_shebeiyeshiyongtongji} />
                        <Route exact path="/lanhu_shezhichangjianwenti" component={lanhu_shezhichangjianwenti} />
                        <Route exact path="/lanhu_shezhigerenxinxiyiwanchengxiugai" component={lanhu_shezhigerenxinxiyiwanchengxiugai} />
                        <Route exact path="/lanhu_jiuguichajianshouyewanzhenglixian" component={lanhu_jiuguichajianshouyewanzhenglixian} />
                        <Route exact path="/lanhu_saoyisaojinxingzhong" component={lanhu_saoyisaojinxingzhong} />
                        <Route exact path="/lanhu_shezhigerenxinxixiugaiyouxiangyifasongyanzhengma" component={lanhu_shezhigerenxinxixiugaiyouxiangyifasongyanzhengma} />
                        <Route exact path="/lanhu_tianjiashebeipeiwangchenggongxuanzefangjian" component={lanhu_tianjiashebeipeiwangchenggongxuanzefangjian} />
                        <Route exact path="/lanhu_chajianyeshebeishezhi" component={lanhu_chajianyeshebeishezhi} />
                        <Route exact path="/lanhu_chajianyeshebeishezhimozugujianbanbenfaxianxinbanben" component={lanhu_chajianyeshebeishezhimozugujianbanbenfaxianxinbanben} />
                        <Route exact path="/lanhu_shezhichangjianwentijiedatuwentongyong" component={lanhu_shezhichangjianwentijiedatuwentongyong} />
                        <Route exact path="/lanhu_shebeiyechushijilixian" component={lanhu_shebeiyechushijilixian} />
                        <Route exact path="/lanhu_tianjiashebei" component={lanhu_tianjiashebei} />
                        <Route exact path="/lanhu_shezhiwentifankuiyidafuzaicifankui" component={lanhu_shezhiwentifankuiyidafuzaicifankui} />
                        <Route exact path="/lanhu_shouye_1" component={lanhu_shouye_1} />
                        <Route exact path="/lanhu_shezhilianxiwomenfasongyoujian" component={lanhu_shezhilianxiwomenfasongyoujian} />
                        <Route exact path="/lanhu_shebeiyechushijilixiantishi" component={lanhu_shebeiyechushijilixiantishi} />
                        <Route exact path="/lanhu_fangjianguanlibianjishanchuchenggong" component={lanhu_fangjianguanlibianjishanchuchenggong} />
                        <Route exact path="/lanhu_shezhilianxiwomen" component={lanhu_shezhilianxiwomen} />
                        <Route exact path="/lanhu_shezhiwentifankuiyidafu" component={lanhu_shezhiwentifankuiyidafu} />
                        <Route exact path="/lanhu_qidongye" component={lanhu_qidongye} />
                        <Route exact path="/lanhu_shezhiwentifankuixinzengchanpinxuanze" component={lanhu_shezhiwentifankuixinzengchanpinxuanze} />
                        <Route exact path="/lanhu_zhuceyanzhengmayancuowudaojishijieshujihuochongxinfasong" component={lanhu_zhuceyanzhengmayancuowudaojishijieshujihuochongxinfasong} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshuweilianjiewifidanchuangtishi" component={lanhu_tianjiashebeisaomiaojieshuweilianjiewifidanchuangtishi} />
                        <Route exact path="/lanhu_zhuceshuruwanchengyanzhengmafasongzhong" component={lanhu_zhuceshuruwanchengyanzhengmafasongzhong} />
                        <Route exact path="/lanhu_shezhiwentifankuiwentileixingzhankai_1" component={lanhu_shezhiwentifankuiwentileixingzhankai_1} />
                        <Route exact path="/lanhu_fangjianguanli" component={lanhu_fangjianguanli} />
                        <Route exact path="/lanhu_tianjiashebeilanyachushizhuangtai" component={lanhu_tianjiashebeilanyachushizhuangtai} />
                        <Route exact path="/lanhu_denglushurucuowutishi" component={lanhu_denglushurucuowutishi} />
                        <Route exact path="/lanhu_shouyebeifenzhanganbianji" component={lanhu_shouyebeifenzhanganbianji} />
                        <Route exact path="/lanhu_shezhigerenxinxinichengxiugaibeifen" component={lanhu_shezhigerenxinxinichengxiugaibeifen} />
                        <Route exact path="/lanhu_chajianyeshebeishezhizhongmingmingshuru" component={lanhu_chajianyeshebeishezhizhongmingmingshuru} />
                        <Route exact path="/lanhu_chajianyeshebeishezhixuanzefangjian" component={lanhu_chajianyeshebeishezhixuanzefangjian} />
                        <Route exact path="/lanhu_fangjianguanlitianjiafangjianfanxian" component={lanhu_fangjianguanlitianjiafangjianfanxian} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshulianjie5gwifitishi" component={lanhu_tianjiashebeisaomiaojieshulianjie5gwifitishi} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaojieshushoujiyilianjiewifi" component={lanhu_tianjiashebeisaomiaojieshushoujiyilianjiewifi} />
                        <Route exact path="/lanhu_dengluzhuce_1" component={lanhu_dengluzhuce_1} />
                        <Route exact path="/lanhu_wode_2" component={lanhu_wode_2} />
                        <Route exact path="/lanhu_shezhiwentifankuiwentitianxiechakan" component={lanhu_shezhiwentifankuiwentitianxiechakan} />
                        <Route exact path="/lanhu_wushebei" component={lanhu_wushebei} />
                        <Route exact path="/lanhu_shebeiyejiashiqi" component={lanhu_shebeiyejiashiqi} />
                        <Route exact path="/lanhu_tianjiashebeisaomiaozhong" component={lanhu_tianjiashebeisaomiaozhong} />
                        <Route exact path="/lanhu_dengluzhaohuimima" component={lanhu_dengluzhaohuimima} />
                        <Route exact path="/lanhu_jiuguichajianshouyewanzhengguanji" component={lanhu_jiuguichajianshouyewanzhengguanji} />
                        <Route exact path="/lanhu_shebeiyechushijishanghuazhuangtai" component={lanhu_shebeiyechushijishanghuazhuangtai} />
                        <Route exact path="/lanhu_fangjianguanlibeibianjishanchu" component={lanhu_fangjianguanlibeibianjishanchu} />
                        <Route exact path="/lanhu_antarcticstar115jiuguishebeiyeuisheji260902" component={lanhu_antarcticstar115jiuguishebeiyeuisheji260902} />
                        <Route exact path="/lanhu_fangjianguanlibeitianjiafangjian" component={lanhu_fangjianguanlibeitianjiafangjian} />
                        <Route exact path="/lanhu_dengluzhuce" component={lanhu_dengluzhuce} />
                        <Route exact path="/lanhu_zhucediquxuanzeqichufasousuoguanbitishi" component={lanhu_zhucediquxuanzeqichufasousuoguanbitishi} />
                        <Route exact path="/lanhu_shebeiyeshezhi" component={lanhu_shebeiyeshezhi} />
                        <Route exact path="/lanhu_zhuceshuruwanchengyanzhengmafasongchenggongbeifen" component={lanhu_zhuceshuruwanchengyanzhengmafasongchenggongbeifen} />
                        <Route exact path="/lanhu_shezhiwentifankuiwuneirong" component={lanhu_shezhiwentifankuiwuneirong} />
                        <Route exact path="/lanhu_chajianyeshebeishezhizhongmingmingshuruchaozifutishi" component={lanhu_chajianyeshebeishezhizhongmingmingshuruchaozifutishi} />
                        <Route exact path="/lanhu_shouyetianjiashebei" component={lanhu_shouyetianjiashebei} />
                        <Route exact path="/lanhu_wode_1" component={lanhu_wode_1} />
                        <Route exact path="/lanhu_fangwushezhixialachuang" component={lanhu_fangwushezhixialachuang} />
                        <Route exact path="/lanhu_shezhiwentifankuixinzeng" component={lanhu_shezhiwentifankuixinzeng} />
                        <Route exact path="/lanhu_shezhigerenxinxinichengxiugaishuruxinyouxiang" component={lanhu_shezhigerenxinxinichengxiugaishuruxinyouxiang} />
                        <Route exact path="/lanhu_shezhichangjianwentijiedatongyong" component={lanhu_shezhichangjianwentijiedatongyong} />
                        <Route exact path="/lanhu_asdesignmobiletemplate0" component={lanhu_asdesignmobiletemplate0} />
                        <Redirect from="/" to="/lanhu_tianjiashebeilanyaxin" />
                    </Switch>
                </div>
            </Router>
        )
    }
}

export default App
