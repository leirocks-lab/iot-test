'use strict';

import React, { Component } from 'react';
import { Switch, NavBar, Checkbox, Radio, Input, Tabs, TabBar, Badge } from 'antd-mobile';

import styles from './assets/index.module.css';

const print = function (value) {};
class DDS_lanhupage_0 extends Component {
  state = {};
  setValue(val) {}
  render() {
    return (
      <div className={`${styles.page} flex-col`}>
        <div className={`${styles['group_1']} flex-col`}>
          <div className={`${styles['block_146']} flex-row justify-between`}>
            <div className={`${styles['box_237']} flex-col justify-between`}>
              <img
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPng909cef9617a8a9cd60f489b95ccbd6b1b36973ca3d51ef0e1422ff0b290f35c4.png')
                }
              />
              <div className={`${styles['text-wrapper_1']}`}>
                <span className={`${styles['text_1']}`}>Antarctica&nbsp;Star&nbsp;智能家居APP</span>
                <span className={`${styles['text_2']}`}>（Symbol）</span>
              </div>
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng9a3af4417f6d8ca3cba4e197451cb6d231afc34c2d28a897c76012f83b525ad7.png')
              }
            />
          </div>
          <div className={`${styles['text-wrapper_314']} flex-row`}>
            <span className={`${styles['text_3']}`}>
              Antarctica&nbsp;Star&nbsp;&nbsp;Mobile&nbsp;组件库旨在保证产品视觉风格的统一，提升设计和开发效率。
            </span>
          </div>
        </div>
        <div className={`${styles['block_147']} flex-col`}>
          <span className={`${styles['text_4']}`}>全局样式&nbsp;Global&nbsp;style</span>
          <div className={`${styles['box_238']} flex-row justify-between`}>
            <div className={`${styles['section_2']} flex-col`}>
              <span className={`${styles['text_5']}`}>色彩样式&nbsp;color</span>
              <div className={`${styles['group_3']} flex-col`}>
                <div className={`${styles['text-wrapper_315']} flex-row`}>
                  <span className={`${styles['text_6']}`}>01&nbsp;品牌色</span>
                </div>
                <div className={`${styles['group_277']} flex-row`}>
                  <div className={`${styles['section_3']} flex-col`} />
                  <div className={`${styles['text-wrapper_316']} flex-col justify-between`}>
                    <span className={`${styles['text_7']}`}>#186DAF</span>
                    <span className={`${styles['text_8']}`}>H:206&nbsp;S:86&nbsp;B:19</span>
                  </div>
                  <div className={`${styles['section_4']} flex-col`} />
                  <div className={`${styles['text-wrapper_317']} flex-col justify-between`}>
                    <span className={`${styles['text_9']}`}>#EE9D31</span>
                    <span className={`${styles['text_10']}`}>H:34&nbsp;S:79&nbsp;B:93</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_5']} flex-col`}>
                <div className={`${styles['text-wrapper_318']} flex-row`}>
                  <span className={`${styles['text_11']}`}>02&nbsp;背景色</span>
                </div>
                <div className={`${styles['text-wrapper_319']} flex-row justify-between`}>
                  <span className={`${styles['text_12']}`}>灰阶-反色（卡片背景）</span>
                  <span className={`${styles['text_13']}`}>分割背景（页面背景）</span>
                </div>
                <div className={`${styles['box_239']} flex-row`}>
                  <div className={`${styles['group_6']} flex-col`} />
                  <div className={`${styles['text-wrapper_320']} flex-col justify-between`}>
                    <span className={`${styles['text_14']}`}>#FFFFFF</span>
                    <span className={`${styles['text_15']}`}>H:0&nbsp;S:0&nbsp;B:100</span>
                  </div>
                  <div className={`${styles['group_7']} flex-col`} />
                  <div className={`${styles['text-wrapper_321']} flex-col justify-between`}>
                    <span className={`${styles['text_16']}`}>#F2F2F2</span>
                    <span className={`${styles['text_17']}`}>H:0&nbsp;S:0&nbsp;B:95</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_322']} flex-row`}>
                  <span className={`${styles['text_18']}`}>控件背景（浅灰色背景）</span>
                </div>
                <div className={`${styles['box_240']} flex-row justify-between`}>
                  <div className={`${styles['group_8']} flex-col`} />
                  <div className={`${styles['text-wrapper_323']} flex-col justify-between`}>
                    <span className={`${styles['text_19']}`}>#E5E5E5</span>
                    <span className={`${styles['text_20']}`}>H:0&nbsp;S:0&nbsp;B:90</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_324']} flex-row justify-between`}>
                  <span className={`${styles['text_21']}`}>主色</span>
                  <span className={`${styles['text_22']}`}>主色浅</span>
                </div>
                <div className={`${styles['box_241']} flex-row`}>
                  <div className={`${styles['section_5']} flex-col`} />
                  <div className={`${styles['text-wrapper_325']} flex-col justify-between`}>
                    <span className={`${styles['text_23']}`}>#1677FF</span>
                    <span className={`${styles['text_24']}`}>H:215&nbsp;S:91&nbsp;B:100</span>
                  </div>
                  <div className={`${styles['section_6']} flex-col`} />
                  <div className={`${styles['text-wrapper_326']} flex-col justify-between`}>
                    <span className={`${styles['text_25']}`}>#D9EBF9</span>
                    <span className={`${styles['text_26']}`}>H:206&nbsp;S:13&nbsp;B:98</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_327']} flex-row`}>
                  <span className={`${styles['text_27']}`}>警告色</span>
                  <span className={`${styles['text_28']}`}>失败色</span>
                  <span className={`${styles['text_29']}`}>成功色</span>
                </div>
                <div className={`${styles['box_242']} flex-row`}>
                  <div className={`${styles['section_7']} flex-col`} />
                  <div className={`${styles['text-wrapper_328']} flex-col justify-between`}>
                    <span className={`${styles['text_30']}`}>#EE9D31</span>
                    <span className={`${styles['text_31']}`}>H:34&nbsp;S:79&nbsp;B:93</span>
                  </div>
                  <div className={`${styles['section_8']} flex-col`} />
                  <div className={`${styles['text-wrapper_329']} flex-col justify-between`}>
                    <span className={`${styles['text_32']}`}>#F0534A</span>
                    <span className={`${styles['text_33']}`}>H:3&nbsp;S:69&nbsp;B:94</span>
                  </div>
                  <div className={`${styles['section_9']} flex-col`} />
                  <div className={`${styles['text-wrapper_330']} flex-col justify-between`}>
                    <span className={`${styles['text_34']}`}>#1CC787</span>
                    <span className={`${styles['text_35']}`}>H:158&nbsp;S:86&nbsp;B:78</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_9']} flex-col`}>
                <div className={`${styles['text-wrapper_331']} flex-row`}>
                  <span className={`${styles['text_36']}`}>03&nbsp;文字色</span>
                </div>
                <div className={`${styles['box_243']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_20']} flex-col`}>
                    <span className={`${styles['text_37']}`}>主色</span>
                  </div>
                  <div className={`${styles['text-wrapper_332']} flex-col justify-between`}>
                    <span className={`${styles['text_38']}`}>#1677FF</span>
                    <span className={`${styles['text_39']}`}>H:215&nbsp;S:91&nbsp;B:100</span>
                  </div>
                </div>
                <div className={`${styles['box_244']} flex-row`}>
                  <div className={`${styles['text-wrapper_22']} flex-col`}>
                    <span className={`${styles['text_40']}`}>警告色</span>
                  </div>
                  <div className={`${styles['text-wrapper_333']} flex-col justify-between`}>
                    <span className={`${styles['text_41']}`}>#EE9D31</span>
                    <span className={`${styles['text_42']}`}>H:34&nbsp;S:79&nbsp;B:93</span>
                  </div>
                  <div className={`${styles['text-wrapper_24']} flex-col`}>
                    <span className={`${styles['text_43']}`}>失败色</span>
                  </div>
                  <div className={`${styles['text-wrapper_334']} flex-col justify-between`}>
                    <span className={`${styles['text_44']}`}>#F0534A</span>
                    <span className={`${styles['text_45']}`}>H:3&nbsp;S:69&nbsp;B:94</span>
                  </div>
                </div>
                <div className={`${styles['box_245']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_26']} flex-col`}>
                    <span className={`${styles['text_46']}`}>成功色</span>
                  </div>
                  <div className={`${styles['text-wrapper_335']} flex-col justify-between`}>
                    <span className={`${styles['text_47']}`}>#1CC787</span>
                    <span className={`${styles['text_48']}`}>H:158&nbsp;S:86&nbsp;B:78</span>
                  </div>
                </div>
                <div className={`${styles['box_246']} flex-row`}>
                  <div className={`${styles['text-wrapper_28']} flex-col`}>
                    <span className={`${styles['text_49']}`}>主标题</span>
                  </div>
                  <div className={`${styles['text-wrapper_336']} flex-col justify-between`}>
                    <span className={`${styles['text_50']}`}>#333333</span>
                    <span className={`${styles['text_51']}`}>H:0&nbsp;S:0&nbsp;B:20</span>
                  </div>
                  <div className={`${styles['text-wrapper_30']} flex-col`}>
                    <span className={`${styles['text_52']}`}>副标题</span>
                  </div>
                  <div className={`${styles['text-wrapper_337']} flex-col justify-between`}>
                    <span className={`${styles['text_53']}`}>#666666</span>
                    <span className={`${styles['text_54']}`}>H:0&nbsp;S:0&nbsp;B:40</span>
                  </div>
                </div>
                <div className={`${styles['box_247']} flex-row`}>
                  <div className={`${styles['text-wrapper_32']} flex-col`}>
                    <span className={`${styles['text_55']}`}>副标题-次级</span>
                  </div>
                  <div className={`${styles['text-wrapper_338']} flex-col justify-between`}>
                    <span className={`${styles['text_56']}`}>#999999</span>
                    <span className={`${styles['text_57']}`}>H:0&nbsp;S:0&nbsp;B:60</span>
                  </div>
                  <div className={`${styles['text-wrapper_34']} flex-col`}>
                    <span className={`${styles['text_58']}`}>弱文案</span>
                  </div>
                  <div className={`${styles['text-wrapper_339']} flex-col justify-between`}>
                    <span className={`${styles['text_59']}`}>#CCCCCC</span>
                    <span className={`${styles['text_60']}`}>H:0&nbsp;S:0&nbsp;B:80</span>
                  </div>
                </div>
                <div className={`${styles['box_248']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_36']} flex-col`}>
                    <span className={`${styles['text_61']}`}>基础色</span>
                  </div>
                  <div className={`${styles['text-wrapper_340']} flex-col justify-between`}>
                    <span className={`${styles['text_62']}`}>#FFFFFF</span>
                    <span className={`${styles['text_63']}`}>H:0&nbsp;S:0&nbsp;B:100</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_16']} flex-col`}>
                <div className={`${styles['text-wrapper_341']} flex-row`}>
                  <span className={`${styles['text_64']}`}>04&nbsp;分割线</span>
                </div>
                <div className={`${styles['box_249']} flex-row`}>
                  <div className={`${styles['group_17']} flex-col`} />
                  <div className={`${styles['text-wrapper_342']} flex-col justify-between`}>
                    <span className={`${styles['text_65']}`}>#CCCCCC</span>
                    <span className={`${styles['text_66']}`}>H:0&nbsp;S:0&nbsp;B:80</span>
                  </div>
                  <div className={`${styles['group_18']} flex-col`} />
                  <div className={`${styles['text-wrapper_343']} flex-col justify-between`}>
                    <span className={`${styles['text_67']}`}>#E5E5E5</span>
                    <span className={`${styles['text_68']}`}>H:0&nbsp;S:0&nbsp;B:90</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_19']} flex-col`}>
                <div className={`${styles['text-wrapper_344']} flex-row`}>
                  <span className={`${styles['text_69']}`}>05&nbsp;蒙层</span>
                </div>
                <div className={`${styles['section_98']} flex-row`}>
                  <div className={`${styles['box_5']} flex-col`} />
                  <div className={`${styles['box_250']} flex-col justify-between`}>
                    <div className={`${styles['text-group_231']} flex-col justify-between`}>
                      <span className={`${styles['text_70']}`}>#FFFFFF</span>
                      <span className={`${styles['text_71']}`}>H:0&nbsp;S:0&nbsp;B:0</span>
                    </div>
                    <span className={`${styles['text_72']}`}>Alpha&nbsp;0.5</span>
                  </div>
                  <div className={`${styles['box_7']} flex-col`} />
                  <div className={`${styles['box_251']} flex-col justify-between`}>
                    <span className={`${styles['text_73']}`}>#FFFFFF</span>
                    <div className={`${styles['text-group_232']} flex-col justify-between`}>
                      <span className={`${styles['text_74']}`}>H:0&nbsp;S:0&nbsp;B:0</span>
                      <span className={`${styles['text_75']}`}>Alpha&nbsp;0.75</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_20']} flex-col`}>
                <div className={`${styles['text-wrapper_345']} flex-row`}>
                  <span className={`${styles['text_76']}`}>06&nbsp;辅助色</span>
                </div>
                <div className={`${styles['group_278']} flex-row`}>
                  <div className={`${styles['box_9']} flex-col`} />
                  <div className={`${styles['box_10']} flex-col`} />
                  <div className={`${styles['box_11']} flex-col`} />
                  <div className={`${styles['box_12']} flex-col`} />
                  <div className={`${styles['box_13']} flex-col`} />
                  <div className={`${styles['box_14']} flex-col`} />
                  <div className={`${styles['box_15']} flex-col`} />
                  <div className={`${styles['box_16']} flex-col`} />
                  <div className={`${styles['box_17']} flex-col`} />
                  <div className={`${styles['box_18']} flex-col`} />
                  <div className={`${styles['box_19']} flex-col`} />
                </div>
                <div className={`${styles['group_279']} flex-row`}>
                  <div className={`${styles['text-group_233']} flex-col justify-between`}>
                    <span className={`${styles['text_77']}`}>#995EFC</span>
                    <span className={`${styles['text_78']}`}>紫色</span>
                  </div>
                  <div className={`${styles['text-group_234']} flex-col justify-between`}>
                    <span className={`${styles['text_79']}`}>#5D49FF</span>
                    <span className={`${styles['text_80']}`}>蓝紫色</span>
                  </div>
                  <div className={`${styles['text-group_235']} flex-col justify-between`}>
                    <span className={`${styles['text_81']}`}>#29C3FF</span>
                    <span className={`${styles['text_82']}`}>湖蓝色</span>
                  </div>
                  <div className={`${styles['text-group_236']} flex-col justify-between`}>
                    <span className={`${styles['text_83']}`}>#00CBB8</span>
                    <span className={`${styles['text_84']}`}>青色</span>
                  </div>
                  <div className={`${styles['text-group_237']} flex-col justify-between`}>
                    <span className={`${styles['text_85']}`}>#1CC787</span>
                    <span className={`${styles['text_86']}`}>绿色</span>
                  </div>
                  <div className={`${styles['text-group_238']} flex-col justify-between`}>
                    <span className={`${styles['text_87']}`}>#FFCD00</span>
                    <span className={`${styles['text_88']}`}>橙色</span>
                  </div>
                  <div className={`${styles['text-group_239']} flex-col justify-between`}>
                    <span className={`${styles['text_89']}`}>#EE9D31</span>
                    <span className={`${styles['text_90']}`}>黄色</span>
                  </div>
                  <div className={`${styles['text-group_240']} flex-col justify-between`}>
                    <span className={`${styles['text_91']}`}>#F68632</span>
                    <span className={`${styles['text_92']}`}>橘黄色</span>
                  </div>
                  <div className={`${styles['text-group_241']} flex-col justify-between`}>
                    <span className={`${styles['text_93']}`}>#FF6A4C</span>
                    <span className={`${styles['text_94']}`}>橘红色</span>
                  </div>
                  <div className={`${styles['text-group_242']} flex-col justify-between`}>
                    <span className={`${styles['text_95']}`}>#F0534A</span>
                    <span className={`${styles['text_96']}`}>红色</span>
                  </div>
                  <div className={`${styles['text-group_243']} flex-col justify-between`}>
                    <span className={`${styles['text_97']}`}>#FF2D84</span>
                    <span className={`${styles['text_98']}`}>紫红色</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['section_10']} flex-col`}>
              <span className={`${styles['text_99']}`}>字体样式&nbsp;font</span>
              <div className={`${styles['group_23']} flex-col`}>
                <span className={`${styles['text_100']}`}>06&nbsp;字号</span>
                <span className={`${styles['text_101']}`}>中文</span>
                <span className={`${styles['text_102']}`}>
                  在基础产品界面的设计中，请使用系统原生，即&nbsp;英文：iOS的PingFang和Android的Roboto；中文：iOS的PingFang和Android的Noto（思源黑体）；大于40字号的字体，使用8的倍数规则选用
                </span>
                <div className={`${styles['text-wrapper_346']} flex-row`}>
                  <span className={`${styles['text_103']}`}>字号大小</span>
                  <span className={`${styles['text_104']}`}>行间距</span>
                  <span className={`${styles['text_105']}`}>使用场景</span>
                </div>
                <img
                  className={`${styles['image_3']}`}
                  src={
                    require('./assets/img/SketchPng0977a92e2c8f89cf47e774387026ac2f28f8db442bd151f93c178a450724a494.png')
                  }
                />
                <div className={`${styles['text-wrapper_347']} flex-row`}>
                  <span className={`${styles['text_106']}`}>32px&nbsp;内容标题</span>
                  <span className={`${styles['text_107']}`}>1.3倍&nbsp;/&nbsp;62-104</span>
                  <span className={`${styles['text_108']}`}>特殊标题</span>
                </div>
                <div className={`${styles['text-wrapper_348']} flex-row`}>
                  <span className={`${styles['text_109']}`}>16px&nbsp;常规内容</span>
                  <span className={`${styles['text_110']}`}>1.5倍&nbsp;/&nbsp;24</span>
                  <span className={`${styles['text_111']}`}>主界面一级栏目标题</span>
                </div>
                <div className={`${styles['text-wrapper_349']} flex-row`}>
                  <span className={`${styles['text_112']}`}>14px&nbsp;次常规内容</span>
                  <span className={`${styles['text_113']}`}>1.5倍&nbsp;/&nbsp;21</span>
                  <span className={`${styles['text_114']}`}>
                    列表&nbsp;/&nbsp;大号正文&nbsp;/&nbsp;摘要&nbsp;/&nbsp;列表提示&nbsp;/&nbsp;正文
                  </span>
                </div>
                <div className={`${styles['text-wrapper_350']} flex-row`}>
                  <span className={`${styles['text_115']}`}>12px&nbsp;次常规内容</span>
                  <span className={`${styles['text_116']}`}>1.5倍&nbsp;/&nbsp;18</span>
                  <span className={`${styles['text_117']}`}>辅助&nbsp;/&nbsp;标签</span>
                </div>
                <div className={`${styles['text-wrapper_351']} flex-row`}>
                  <span className={`${styles['text_118']}`}>10px&nbsp;弱化内容和弱辅助文案</span>
                  <span className={`${styles['text_119']}`}>1.5倍&nbsp;/&nbsp;16</span>
                  <span className={`${styles['text_120']}`}>示意&nbsp;/&nbsp;底部导航</span>
                </div>
                <div className={`${styles['block_5']} flex-col`} />
                <span className={`${styles['text_121']}`}>特殊数字</span>
                <span className={`${styles['text_122']}`}>
                  字体：DIN&nbsp;Alternate；大于40字号的数字，使用8的倍数规则选用。比如40、48、56、64、88、96...以此类推
                </span>
                <div className={`${styles['block_148']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_49']} flex-row`}>
                    <span className={`${styles['text_123']}`}>45</span>
                    <span className={`${styles['text_124']}`}>%</span>
                    <span className={`${styles['text_125']}`}>24px&nbsp;进度条进度显示</span>
                  </div>
                  <div className={`${styles['group_24']} flex-row`}>
                    <div className={`${styles['section_99']} flex-col justify-between`}>
                      <div className={`${styles['text-wrapper_352']} flex-row justify-between`}>
                        <span className={`${styles['text_126']}`}>40</span>
                        <span className={`${styles['text_127']}`}>%</span>
                      </div>
                      <span className={`${styles['text_128']}`}>目标湿度</span>
                    </div>
                    <span className={`${styles['text_129']}`}>24px&nbsp;插件页顶部关键数值展示</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_51']} flex-row`}>
                  <span className={`${styles['text_130']}`}>35</span>
                  <span className={`${styles['text_131']}`}>°F</span>
                  <span className={`${styles['text_132']}`}>36px&nbsp;&nbsp;&nbsp;选择器组件单一数值</span>
                </div>
              </div>
              <div className={`${styles['group_25']} flex-col`}>
                <div className={`${styles['text-wrapper_353']} flex-row`}>
                  <span className={`${styles['text_133']}`}>07&nbsp;行高</span>
                </div>
                <div className={`${styles['image-wrapper_78']} flex-row`}>
                  <img
                    className={`${styles['image_4']}`}
                    src={
                      require('./assets/img/SketchPng240aa05393fab7c0622f95640c48b50b6fe641dfbf31e02ae7a37ebc16327d7c.png')
                    }
                  />
                </div>
                <div className={`${styles['box_252']} flex-row`}>
                  <span className={`${styles['text_134']}`}>系统默认</span>
                  <span className={`${styles['paragraph_1']}`}>
                    多行文案
                    <br />
                    多行文案
                  </span>
                  <img
                    className={`${styles['image_5']}`}
                    src={
                      require('./assets/img/SketchPng240aa05393fab7c0622f95640c48b50b6fe641dfbf31e02ae7a37ebc16327d7c.png')
                    }
                  />
                  <img
                    className={`${styles['image_6']}`}
                    src={
                      require('./assets/img/SketchPng240aa05393fab7c0622f95640c48b50b6fe641dfbf31e02ae7a37ebc16327d7c.png')
                    }
                  />
                </div>
                <div className={`${styles['box_253']} flex-row`}>
                  <div className={`${styles['image-wrapper_2']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_1']}`}
                      src={
                        require('./assets/img/SketchPng26c9f5eff05d6dc86f3830652fda5b776ced32cb5e77fb68bf467b6de6e1fe55.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['box_254']} flex-row`}>
                  <span className={`${styles['text_135']}`}>1.5倍行高</span>
                  <span className={`${styles['paragraph_2']}`}>
                    多行文案
                    <br />
                    多行文案
                  </span>
                  <span className={`${styles['text_136']}`}>1.5a</span>
                  <span className={`${styles['text_137']}`}>1.5a</span>
                  <img
                    className={`${styles['thumbnail_2']}`}
                    src={
                      require('./assets/img/SketchPng8edcb19f025fdaff7ccf3fc857c932caf5ff87606d236c370780561617da5edc.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_3']}`}
                    src={
                      require('./assets/img/SketchPng26c9f5eff05d6dc86f3830652fda5b776ced32cb5e77fb68bf467b6de6e1fe55.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_4']}`}
                    src={
                      require('./assets/img/SketchPng8edcb19f025fdaff7ccf3fc857c932caf5ff87606d236c370780561617da5edc.png')
                    }
                  />
                  <img
                    className={`${styles['image_7']}`}
                    src={
                      require('./assets/img/SketchPng30670aea381c521e90c01cc2d20faa43ec38fc7cd80b94b14e8bb5ae49d9f677.png')
                    }
                  />
                  <img
                    className={`${styles['image_8']}`}
                    src={
                      require('./assets/img/SketchPnga929ba133d71a68463c03b2c160c7072e0bcebab15805a042bfaee5e28bbf118.png')
                    }
                  />
                  <img
                    className={`${styles['image_9']}`}
                    src={
                      require('./assets/img/SketchPnga929ba133d71a68463c03b2c160c7072e0bcebab15805a042bfaee5e28bbf118.png')
                    }
                  />
                </div>
                <div className={`${styles['box_255']} flex-row`}>
                  <span className={`${styles['text_138']}`}>1倍行高</span>
                  <span className={`${styles['text_139']}`}>单行文案</span>
                  <span className={`${styles['text_140']}`}>1a</span>
                  <div className={`${styles['image-wrapper_3']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_5']}`}
                      src={
                        require('./assets/img/SketchPngcb038fb94668e7c5a82a3434fa8123b4a678489d99a249a97d4ec4aed701c1e3.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-wrapper_4']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_6']}`}
                      src={
                        require('./assets/img/SketchPngc28144efffef61be6e4fd185805bf5c7939f73285a0110c0842f1976722805dc.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <span className={`${styles['text_141']}`}>图标样式&nbsp;icon</span>
              <div className={`${styles['group_280']} flex-row`}>
                <span className={`${styles['text_142']}`}>制作标准</span>
                <div className={`${styles['image-text_169']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_10']}`}
                    src={
                      require('./assets/img/SketchPng1266ae579a2638fc2a24ac962cf3c39ad8d401bcd8f6ce52ee0ab4c3668b511b.png')
                    }
                  />
                  <span className={`${styles['text-group_14']}`}>范围</span>
                </div>
                <div className={`${styles['block_149']} flex-col justify-between`}>
                  <div className={`${styles['group_27']} flex-col`}>
                    <div className={`${styles['section_12']} flex-col`} />
                  </div>
                  <span className={`${styles['text_143']}`}>方形</span>
                </div>
                <div className={`${styles['image-text_170']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_11']}`}
                    src={
                      require('./assets/img/SketchPng6e62d2a32715215005e181c2fcaabe4daa70f48233d2ae83f87290ef5524a062.png')
                    }
                  />
                  <span className={`${styles['text-group_15']}`}>横形</span>
                </div>
                <div className={`${styles['image-text_171']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_12']}`}
                    src={
                      require('./assets/img/SketchPnge8785bb7d029157f6f3adc718644768daee99b3ea785ca3e8b1865405b8adaf8.png')
                    }
                  />
                  <span className={`${styles['text-group_16']}`}>竖形</span>
                </div>
                <div className={`${styles['image-text_172']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_13']}`}
                    src={
                      require('./assets/img/SketchPng1b729f2fad842b6ace4772adcbc6344526c5370a05b00696b6f19c49657ab331.png')
                    }
                  />
                  <span className={`${styles['text-group_17']}`}>圆形</span>
                </div>
              </div>
              <div className={`${styles['group_281']} flex-row`}>
                <span className={`${styles['text_144']}`}>切图规则</span>
                <span className={`${styles['text_145']}`}>60pt</span>
                <img
                  className={`${styles['image_14']}`}
                  src={
                    require('./assets/img/SketchPng07b393748677b0ca59a803f15eff8a157e2ba826b13a96772516efa02460e6e0.png')
                  }
                />
                <div className={`${styles['box_256']} flex-col`}>
                  <span className={`${styles['text_146']}`}>60pt</span>
                  <img
                    className={`${styles['image_15']}`}
                    src={
                      require('./assets/img/SketchPng8c60db5f7a82ae5e01a4d8b8790ed3d2ca0ac23f6283be1ff10ce7447c8589a7.png')
                    }
                  />
                  <div className={`${styles['section_13']} flex-col`}>
                    <div className={`${styles['box_21']} flex-col`} />
                  </div>
                </div>
                <span className={`${styles['text_147']}`}>48pt</span>
                <img
                  className={`${styles['image_16']}`}
                  src={
                    require('./assets/img/SketchPnga8d8197258c7a0851e0786c0d238a284496184856192556ba8ce5edcd8cbafee.png')
                  }
                />
                <div className={`${styles['box_257']} flex-col`}>
                  <span className={`${styles['text_148']}`}>48pt</span>
                  <img
                    className={`${styles['image_17']}`}
                    src={
                      require('./assets/img/SketchPng4544eb23b9ac1dd64d554473ba2c00e3a889a795644e0bc272bc5db7a86997a7.png')
                    }
                  />
                  <div className={`${styles['box_23']} flex-col`}>
                    <div className={`${styles['section_14']} flex-col`} />
                  </div>
                </div>
                <span className={`${styles['text_149']}`}>36pt</span>
                <img
                  className={`${styles['image_18']}`}
                  src={
                    require('./assets/img/SketchPng6c195f1167205fe57cdcb6d983cf17a4e5c2231ed2668bd88b4ee4c0054e8b22.png')
                  }
                />
                <div className={`${styles['box_258']} flex-col`}>
                  <span className={`${styles['text_150']}`}>36pt</span>
                  <img
                    className={`${styles['image_19']}`}
                    src={
                      require('./assets/img/SketchPng81924b0db93efa9023991e1b605ad33c2ce1ee2f6ace29d69b2310b3d4bab0c6.png')
                    }
                  />
                  <div className={`${styles['box_25']} flex-col`}>
                    <div className={`${styles['group_29']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['box_259']} flex-col`}>
                  <span className={`${styles['text_151']}`}>24pt</span>
                  <img
                    className={`${styles['thumbnail_7']}`}
                    src={
                      require('./assets/img/SketchPng064d446e4d189f8ba5f17b7e66fd839bfa3d806cacb8de58063f05f7cf1fc52a.png')
                    }
                  />
                  <div className={`${styles['image-text_173']} flex-row`}>
                    <span className={`${styles['text-group_18']}`}>24pt</span>
                    <img
                      className={`${styles['thumbnail_8']}`}
                      src={
                        require('./assets/img/SketchPngb6042f3013cf52c3e5e45106127dee32c27096c521d1381a94aabf75fefcbf0c.png')
                      }
                    />
                    <div className={`${styles['section_15']} flex-col`}>
                      <div className={`${styles['box_27']} flex-col`} />
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_260']} flex-col`}>
                  <span className={`${styles['text_152']}`}>16pt</span>
                  <img
                    className={`${styles['thumbnail_9']}`}
                    src={
                      require('./assets/img/SketchPngfd513c069ebb718bd20d4354da754f208b4bb38bc7b1d2d881a2ce69c4e1984b.png')
                    }
                  />
                  <div className={`${styles['image-text_174']} flex-row justify-between`}>
                    <span className={`${styles['text-group_19']}`}>16pt</span>
                    <img
                      className={`${styles['thumbnail_10']}`}
                      src={
                        require('./assets/img/SketchPngaf3ea2d754941a7bd56732a53189a9824b02aac56f9eae483e1c5b6d5093f479.png')
                      }
                    />
                    <div className={`${styles['block_12']} flex-col`}>
                      <div className={`${styles['group_30']} flex-col`} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_282']} flex-row`}>
                <span className={`${styles['text_153']}`}>线条粗细</span>
                <div className={`${styles['group_283']} flex-col`}>
                  <img
                    className={`${styles['image_20']}`}
                    src={
                      require('./assets/img/SketchPng5697fec1c96d662e7742fe201cf76ec57a452687db906a17079f95d36a3adfc4.png')
                    }
                  />
                  <div className={`${styles['image-wrapper_5']} flex-col`}>
                    <img
                      className={`${styles['image_21']}`}
                      src={
                        require('./assets/img/SketchPng9018b677eccebb5e6c8ed8164cc36697c6b42e2e314cc3c10a872593535d0545.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_22']}`}
                    src={
                      require('./assets/img/SketchPng7da28c51662d672cb3f8856cb98222f77976f12c9aa0603b98c50ee9815f6dd7.png')
                    }
                  />
                  <div className={`${styles['image-wrapper_6']} flex-col`}>
                    <img
                      className={`${styles['image_23']}`}
                      src={
                        require('./assets/img/SketchPng7e802ec36f90e6cbab5c38fdd2587a0113ebf5b999352faf16ac2644b85b6fca.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-wrapper_354']} flex-col justify-between`}>
                  <span className={`${styles['text_154']}`}>2pt</span>
                  <span className={`${styles['text_155']}`}>1.5pt</span>
                </div>
                <div className={`${styles['group_33']} flex-col`}>
                  <div className={`${styles['section_100']} flex-row`}>
                    <div className={`${styles['section_16']} flex-col`} />
                  </div>
                  <div className={`${styles['section_101']} flex-row`}>
                    <div className={`${styles['group_34']} flex-col`} />
                  </div>
                  <img
                    className={`${styles['image_24']}`}
                    src={
                      require('./assets/img/SketchPng090aa80ecbaeac11e444a740c8c0bdfb7c88b1c6d12bd19f1ddaff55d1b5f059.png')
                    }
                  />
                  <img
                    className={`${styles['image_25']}`}
                    src={
                      require('./assets/img/SketchPng89498b002503a2a18e9acd3b002a45ae2929455cdd762c285b80339a15dc83a6.png')
                    }
                  />
                  <div className={`${styles['block_15']} flex-col`}>
                    <div className={`${styles['block_16']} flex-col`} />
                  </div>
                </div>
                <span className={`${styles['text_156']}`}>2pt</span>
                <div className={`${styles['group_35']} flex-col`}>
                  <div className={`${styles['block_17']} flex-col`} />
                  <div className={`${styles['block_18']} flex-col`}>
                    <div className={`${styles['group_36']} flex-col`} />
                  </div>
                  <img
                    className={`${styles['image_26']}`}
                    src={
                      require('./assets/img/SketchPngc12f0c9ef3fc5455f6a95e6a23c9571a22c5284f9eeab08aa303d5fbfef29135.png')
                    }
                  />
                  <div className={`${styles['block_19']} flex-col`}>
                    <div className={`${styles['section_17']} flex-col`} />
                  </div>
                </div>
                <span className={`${styles['text_157']}`}>1.5pt</span>
                <div className={`${styles['image-wrapper_7']} flex-col`}>
                  <img
                    className={`${styles['image_27']}`}
                    src={
                      require('./assets/img/SketchPngd59223add77bfc7e346d3e77f0d0fde2fe03631bceaea1f3403b01d26562c5ac.png')
                    }
                  />
                  <img
                    className={`${styles['image_28']}`}
                    src={
                      require('./assets/img/SketchPngc848528fc5aef0b915e6c8d7738d7cfd4efa9b8765e4e294a873e95418ac6400.png')
                    }
                  />
                </div>
                <span className={`${styles['text_158']}`}>1pt</span>
              </div>
              <div className={`${styles['group_284']} flex-row justify-between`}>
                <div className={`${styles['box_261']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_29']}`}
                    src={
                      require('./assets/img/SketchPnga861daf7c1e66de1daa2869a67116c02d207f6547b848063b57ee6d73ce3dc04.png')
                    }
                  />
                  <div className={`${styles['group_38']} flex-col`} />
                  <img
                    className={`${styles['image_30']}`}
                    src={
                      require('./assets/img/SketchPngb161526e57350f293dbb4e1e6664191c7ca15708e05397054dadb62bdb5519d5.png')
                    }
                  />
                </div>
                <span className={`${styles['text_159']}`}>1pt</span>
              </div>
              <div className={`${styles['group_39']} flex-col`}>
                <div className={`${styles['image-wrapper_79']} flex-row`}>
                  <img
                    className={`${styles['label_1']}`}
                    src={
                      require('./assets/img/SketchPng4e4ef71a2eae28e73b22c5548d34fd3bc97097ab29b21315b516255638877833.png')
                    }
                  />
                </div>
                <div className={`${styles['group_285']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_54']}`}>
                    <span className={`${styles['text_160']}`}>Pow</span>
                    <span className={`${styles['text_161']}`}>e</span>
                    <span className={`${styles['text_162']}`}>r</span>
                  </div>
                  <span className={`${styles['text_163']}`}>Lock</span>
                </div>
                <div className={`${styles['text-wrapper_355']} flex-row justify-between`}>
                  <span className={`${styles['text_164']}`}>电源</span>
                  <span className={`${styles['text_165']}`}>锁定</span>
                </div>
                <div className={`${styles['box_31']} flex-col`}>
                  <div className={`${styles['image-wrapper_80']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_2']}`}
                      src={
                        require('./assets/img/SketchPngaefc7944e255b57a89b8f0bf76961e84942beddd4e448b5edf7ffd721b2f8c83.png')
                      }
                    />
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/SketchPng1629cbdc3277fcdd65bff5cb0b980357424c25ea468ffc4d578db79f747e1286.png')
                      }
                    />
                    <img
                      className={`${styles['label_4']}`}
                      src={
                        require('./assets/img/SketchPngd9970bcf21afe3afc5c79cc3f819032134dff2e6d70c4d4d399b1f94b75dbfda.png')
                      }
                    />
                    <img
                      className={`${styles['label_5']}`}
                      src={
                        require('./assets/img/SketchPng77bfcecc2507cc528dc9a4f82ab69ad835905b4dcca3f830fa92e6d623d8f6dd.png')
                      }
                    />
                    <img
                      className={`${styles['label_6']}`}
                      src={
                        require('./assets/img/SketchPngbe8d46b6fc81970dda4a1bf962c8728c7134197e5cd8aa3f621c878d1ec9b982.png')
                      }
                    />
                    <img
                      className={`${styles['label_7']}`}
                      src={
                        require('./assets/img/SketchPng143b9e8adbd9e6a7a42869c574119ee7aa6bfa2d4301a64b3f631ac66d18519c.png')
                      }
                    />
                    <img
                      className={`${styles['label_8']}`}
                      src={
                        require('./assets/img/SketchPng10fe22b0591aa6aacdac5a9fdd1d2934086f8a23a7e9aaee39cbe6011142a629.png')
                      }
                    />
                    <img
                      className={`${styles['label_9']}`}
                      src={
                        require('./assets/img/SketchPngb2827575caf16dda0f1abe39e779df5cc8f361c251a5b063a9b5f72ff77d637f.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_102']} flex-row`}>
                    <span className={`${styles['text_166']}`}>Un&nbsp;Lock</span>
                    <div className={`${styles['text-wrapper_56']}`}>
                      <span className={`${styles['text_167']}`}>Inc</span>
                      <span className={`${styles['text_168']}`}>r</span>
                      <span className={`${styles['text_169']}`}>eace</span>
                    </div>
                    <div className={`${styles['text-wrapper_57']}`}>
                      <span className={`${styles['text_170']}`}>R</span>
                      <span className={`${styles['text_171']}`}>educe</span>
                    </div>
                    <div className={`${styles['text-wrapper_58']}`}>
                      <span className={`${styles['text_172']}`}>U</span>
                      <span className={`${styles['text_173']}`}>p</span>
                      <span className={`${styles['text_174']}`}>/Inc</span>
                      <span className={`${styles['text_175']}`}>r</span>
                      <span className={`${styles['text_176']}`}>ease</span>
                    </div>
                    <div className={`${styles['text-wrapper_59']}`}>
                      <span className={`${styles['text_177']}`}>D</span>
                      <span className={`${styles['text_178']}`}>o</span>
                      <span className={`${styles['text_179']}`}>wn/</span>
                      <span className={`${styles['text_180']}`}>R</span>
                      <span className={`${styles['text_181']}`}>educe</span>
                    </div>
                    <div className={`${styles['text-wrapper_60']}`}>
                      <span className={`${styles['text_182']}`}>Le</span>
                      <span className={`${styles['text_183']}`}>f</span>
                      <span className={`${styles['text_184']}`}>t</span>
                    </div>
                    <span className={`${styles['text_185']}`}>Right</span>
                    <span className={`${styles['text_186']}`}>Scan</span>
                    <div className={`${styles['text-wrapper_61']}`}>
                      <span className={`${styles['text_187']}`}>Blue</span>
                      <span className={`${styles['text_188']}`}>t</span>
                      <span className={`${styles['text_189']}`}>ooth</span>
                    </div>
                  </div>
                  <div className={`${styles['image-wrapper_81']} flex-row justify-between`}>
                    <img
                      className={`${styles['image_31']}`}
                      src={
                        require('./assets/img/SketchPng8a7be9c6769483827238b1eb565d04039b54f8a35ad4bdbc0939e0f6241279d4.png')
                      }
                    />
                    <img
                      className={`${styles['label_10']}`}
                      src={
                        require('./assets/img/SketchPng1f41119745ca5c1b518cfcfbb25233f247e40fefb64a6442596a9ac164616529.png')
                      }
                    />
                    <img
                      className={`${styles['label_11']}`}
                      src={
                        require('./assets/img/SketchPng6c9d076771aac4a90407095eef5d0f3e23529c587f399746cc0593e74ce1ec30.png')
                      }
                    />
                    <img
                      className={`${styles['label_12']}`}
                      src={
                        require('./assets/img/SketchPngc8ddd7db6a056bd593074f86aa1daf8f90cf94af0ffd829e1e76a5bb7d334e93.png')
                      }
                    />
                    <img
                      className={`${styles['label_13']}`}
                      src={
                        require('./assets/img/SketchPngfd51ac42bfa81a559d4d10d7f4464d0fedd936794876ae4bdf3f20b9db051339.png')
                      }
                    />
                    <img
                      className={`${styles['label_14']}`}
                      src={
                        require('./assets/img/SketchPng889913cedc66a5841320ffd158bf32f3bc2a4a0c13ae2f7fb6424821e99f0581.png')
                      }
                    />
                    <img
                      className={`${styles['label_15']}`}
                      src={
                        require('./assets/img/SketchPng82e73b713646bc6a223f146afbf4d5fe647e01a62a07e1770ea287af4fe8ba4e.png')
                      }
                    />
                    <img
                      className={`${styles['label_16']}`}
                      src={
                        require('./assets/img/SketchPngc34b0aa11c796eca183efd74666afcc91ba6ba2076a417ec86f7c7e600715009.png')
                      }
                    />
                    <img
                      className={`${styles['label_17']}`}
                      src={
                        require('./assets/img/SketchPngb622906049d4aed201a4b2bdb5d69940cdc8546f063abbbab6332ab1dc7f5764.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_103']} flex-row`}>
                    <div className={`${styles['text-wrapper_62']}`}>
                      <span className={`${styles['text_190']}`}>Mo</span>
                      <span className={`${styles['text_191']}`}>r</span>
                      <span className={`${styles['text_192']}`}>e</span>
                    </div>
                    <span className={`${styles['text_193']}`}>Edit</span>
                    <div className={`${styles['text-wrapper_63']}`}>
                      <span className={`${styles['text_194']}`}>S</span>
                      <span className={`${styles['text_195']}`}>wi</span>
                      <span className={`${styles['text_196']}`}>t</span>
                      <span className={`${styles['text_197']}`}>ch</span>
                    </div>
                    <div className={`${styles['text-wrapper_64']}`}>
                      <span className={`${styles['text_198']}`}>W</span>
                      <span className={`${styles['text_199']}`}>i-Fi</span>
                    </div>
                    <div className={`${styles['text-wrapper_65']}`}>
                      <span className={`${styles['text_200']}`}>C</span>
                      <span className={`${styles['text_201']}`}>ountry</span>
                    </div>
                    <span className={`${styles['text_202']}`}>Email</span>
                    <div className={`${styles['text-wrapper_66']}`}>
                      <span className={`${styles['text_203']}`}>W</span>
                      <span className={`${styles['text_204']}`}>arning</span>
                    </div>
                    <span className={`${styles['text_205']}`}>Home</span>
                    <div className={`${styles['text-wrapper_67']}`}>
                      <span className={`${styles['text_206']}`}>Sele</span>
                      <span className={`${styles['text_207']}`}>c</span>
                      <span className={`${styles['text_208']}`}>t</span>
                    </div>
                    <div className={`${styles['text-wrapper_68']}`}>
                      <span className={`${styles['text_209']}`}>Multi</span>
                      <span className={`${styles['text_210']}`}>-</span>
                      <span className={`${styles['text_211']}`}>sele</span>
                      <span className={`${styles['text_212']}`}>c</span>
                      <span className={`${styles['text_213']}`}>t</span>
                    </div>
                    <div className={`${styles['text-wrapper_69']}`}>
                      <span className={`${styles['text_214']}`}>Multi</span>
                      <span className={`${styles['text_215']}`}>-</span>
                      <span className={`${styles['text_216']}`}>sele</span>
                      <span className={`${styles['text_217']}`}>c</span>
                      <span className={`${styles['text_218']}`}>t</span>
                    </div>
                  </div>
                  <div className={`${styles['image-wrapper_82']} flex-row justify-between`}>
                    <img
                      className={`${styles['image_32']}`}
                      src={
                        require('./assets/img/SketchPng1fa5705c8170fe2479ec47de9f29d4d014e7ecc73df088cb980664779cdd063d.png')
                      }
                    />
                    <img
                      className={`${styles['label_18']}`}
                      src={
                        require('./assets/img/SketchPngda7a3f663abac778e2acfd3d3374f3e78ec7c70513737c5bce2c44dcfa39db53.png')
                      }
                    />
                    <img
                      className={`${styles['label_19']}`}
                      src={
                        require('./assets/img/SketchPngc732920c301d3176f6660e56f913e0255edc4ebb81bfa887f0742e598abf76c6.png')
                      }
                    />
                    <img
                      className={`${styles['label_20']}`}
                      src={
                        require('./assets/img/SketchPngcc1cf05e7cb4b754bff449db444407a2bd788b64a85e69908038805cf8cf0bca.png')
                      }
                    />
                    <img
                      className={`${styles['label_21']}`}
                      src={
                        require('./assets/img/SketchPng10137a9ee7d111056f606bfe553e252f94bd788b30cf2a1d16088c49f4870b09.png')
                      }
                    />
                    <img
                      className={`${styles['label_22']}`}
                      src={
                        require('./assets/img/SketchPng32778d455024d21d16453be2232db8b7e6ab101641e0cccabcc59f1df50025e5.png')
                      }
                    />
                    <img
                      className={`${styles['label_23']}`}
                      src={
                        require('./assets/img/SketchPngf1664bada8ffc81b5759b9581229546ede9e7d5759eee75f9181d029ae3bee2a.png')
                      }
                    />
                    <img
                      className={`${styles['label_24']}`}
                      src={
                        require('./assets/img/SketchPngefbf3343be709ec5239777145f79240d09bc4897f7bd9d6cedd14cf7d9f1c2ed.png')
                      }
                    />
                    <img
                      className={`${styles['label_25']}`}
                      src={
                        require('./assets/img/SketchPng77a369859f5428111c9e9f3ed98bc1a4425ec141ca92a83d2ad7cbb713a71959.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_104']} flex-row`}>
                    <div className={`${styles['text-wrapper_70']}`}>
                      <span className={`${styles['text_219']}`}>Dele</span>
                      <span className={`${styles['text_220']}`}>t</span>
                      <span className={`${styles['text_221']}`}>e</span>
                    </div>
                    <div className={`${styles['text-wrapper_71']}`}>
                      <span className={`${styles['text_222']}`}>Dele</span>
                      <span className={`${styles['text_223']}`}>t</span>
                      <span className={`${styles['text_224']}`}>e</span>
                    </div>
                    <div className={`${styles['text-wrapper_72']}`}>
                      <span className={`${styles['text_225']}`}>Dele</span>
                      <span className={`${styles['text_226']}`}>t</span>
                      <span className={`${styles['text_227']}`}>e</span>
                    </div>
                    <div className={`${styles['text-wrapper_73']}`}>
                      <span className={`${styles['text_228']}`}>R</span>
                      <span className={`${styles['text_229']}`}>ooms</span>
                    </div>
                    <span className={`${styles['text_230']}`}>Manual</span>
                    <div className={`${styles['text-wrapper_74']}`}>
                      <span className={`${styles['text_231']}`}>Se</span>
                      <span className={`${styles['text_232']}`}>t</span>
                      <span className={`${styles['text_233']}`}>tings</span>
                    </div>
                    <div className={`${styles['text-wrapper_75']}`}>
                      <span className={`${styles['text_234']}`}>Sha</span>
                      <span className={`${styles['text_235']}`}>r</span>
                      <span className={`${styles['text_236']}`}>e</span>
                    </div>
                    <span className={`${styles['text_237']}`}>Language</span>
                    <span className={`${styles['text_238']}`}>About</span>
                    <span className={`${styles['text_239']}`}>Help</span>
                    <div className={`${styles['text-wrapper_76']}`}>
                      <span className={`${styles['text_240']}`}>C</span>
                      <span className={`${styles['text_241']}`}>on</span>
                      <span className={`${styles['text_242']}`}>t</span>
                      <span className={`${styles['text_243']}`}>a</span>
                      <span className={`${styles['text_244']}`}>c</span>
                      <span className={`${styles['text_245']}`}>t&nbsp;Us</span>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_356']} flex-row`}>
                    <span className={`${styles['text_246']}`}>解锁</span>
                    <span className={`${styles['text_247']}`}>加</span>
                    <span className={`${styles['text_248']}`}>减</span>
                    <span className={`${styles['text_249']}`}>上</span>
                    <span className={`${styles['text_250']}`}>下</span>
                    <span className={`${styles['text_251']}`}>左</span>
                    <span className={`${styles['text_252']}`}>右</span>
                    <span className={`${styles['text_253']}`}>扫一扫</span>
                    <span className={`${styles['text_254']}`}>蓝牙</span>
                  </div>
                  <div className={`${styles['text-wrapper_357']} flex-row`}>
                    <span className={`${styles['text_255']}`}>更多</span>
                    <span className={`${styles['text_256']}`}>编辑</span>
                    <span className={`${styles['text_257']}`}>切换</span>
                    <span className={`${styles['text_258']}`}>网络/Wi-Fi</span>
                    <span className={`${styles['text_259']}`}>国家</span>
                    <span className={`${styles['text_260']}`}>邮箱</span>
                    <span className={`${styles['text_261']}`}>警示</span>
                    <span className={`${styles['text_262']}`}>搜索</span>
                    <span className={`${styles['text_263']}`}>选择</span>
                    <span className={`${styles['text_264']}`}>多选</span>
                    <span className={`${styles['text_265']}`}>多选</span>
                  </div>
                  <div className={`${styles['text-wrapper_358']} flex-row`}>
                    <span className={`${styles['text_266']}`}>删除</span>
                    <span className={`${styles['text_267']}`}>删除2</span>
                    <span className={`${styles['text_268']}`}>删除3</span>
                    <span className={`${styles['text_269']}`}>房间管理</span>
                    <span className={`${styles['text_270']}`}>说明书</span>
                    <span className={`${styles['text_271']}`}>设置</span>
                    <span className={`${styles['text_272']}`}>分享</span>
                    <span className={`${styles['text_273']}`}>语言</span>
                    <span className={`${styles['text_274']}`}>关于</span>
                    <span className={`${styles['text_275']}`}>帮助</span>
                    <span className={`${styles['text_276']}`}>联系我们</span>
                  </div>
                  <div className={`${styles['group_43']} flex-col`}>
                    <div className={`${styles['image-wrapper_83']} flex-row justify-between`}>
                      <img
                        className={`${styles['image_33']}`}
                        src={
                          require('./assets/img/SketchPng86687772d8e7ca083b91856849297336803a29f076bed4ce226396b8773fab1a.png')
                        }
                      />
                      <img
                        className={`${styles['label_26']}`}
                        src={
                          require('./assets/img/SketchPnge027fd3d828372149750a451152f612c07dd87119e2bb06e55e461305ad1363d.png')
                        }
                      />
                      <img
                        className={`${styles['label_27']}`}
                        src={
                          require('./assets/img/SketchPng70212dbebe3730d82f2746bcd764b8e9dd698a766590a7d438ddf11d93357dd8.png')
                        }
                      />
                      <img
                        className={`${styles['label_28']}`}
                        src={
                          require('./assets/img/SketchPngf4a2c6b1bdfabee5ecb0bb9c8d3b278c13860ae37ba0f1e208c6f52854839098.png')
                        }
                      />
                      <img
                        className={`${styles['label_29']}`}
                        src={
                          require('./assets/img/SketchPng9eb85abb9f5c15835565a9d891d75b12e0ca7c9dddf820a14cfa07a9b8c7f6e7.png')
                        }
                      />
                      <img
                        className={`${styles['label_30']}`}
                        src={
                          require('./assets/img/SketchPngd07ef20d782c9f3ebafff5f020ed70d3ba5bebd86da1a1ab1398882a23996da8.png')
                        }
                      />
                      <img
                        className={`${styles['label_31']}`}
                        src={
                          require('./assets/img/SketchPngb1ed85e3544ab47029a347774203f7a81771254c2bc271d75a1b678e0b78d3fc.png')
                        }
                      />
                      <img
                        className={`${styles['label_32']}`}
                        src={
                          require('./assets/img/SketchPng259468b93e3cf3b960f4bb30dc402e56d6ce568b152cec8b6a809127615ec65c.png')
                        }
                      />
                      <img
                        className={`${styles['label_33']}`}
                        src={
                          require('./assets/img/SketchPng587a14c0aba3f2a1b644805314feb0f6e56b17eb67abd5a113067b91663bc32b.png')
                        }
                      />
                    </div>
                    <div className={`${styles['block_150']} flex-row`}>
                      <div className={`${styles['text-group_244']} flex-col`}>
                        <div className={`${styles['text-wrapper_80']}`}>
                          <span className={`${styles['text_277']}`}>Dele</span>
                          <span className={`${styles['text_278']}`}>t</span>
                          <span className={`${styles['text_279']}`}>e</span>
                          <span className={`${styles['text_280']}`}>/</span>
                          <span className={`${styles['text_281']}`}>Close</span>
                        </div>
                        <span className={`${styles['text_282']}`}>删除/关闭</span>
                      </div>
                      <div className={`${styles['text-group_245']} flex-col`}>
                        <div className={`${styles['text-wrapper_81']}`}>
                          <span className={`${styles['text_283']}`}>Dele</span>
                          <span className={`${styles['text_284']}`}>t</span>
                          <span className={`${styles['text_285']}`}>e</span>
                          <span className={`${styles['text_286']}`}>/</span>
                          <span className={`${styles['text_287']}`}>Close</span>
                        </div>
                        <span className={`${styles['text_288']}`}>删除/关闭2</span>
                      </div>
                      <div className={`${styles['text-group_246']} flex-col`}>
                        <span className={`${styles['text_289']}`}>Display</span>
                        <span className={`${styles['text_290']}`}>显示</span>
                      </div>
                      <div className={`${styles['text-group_247']} flex-col`}>
                        <span className={`${styles['text_291']}`}>Hide</span>
                        <span className={`${styles['text_292']}`}>隐密</span>
                      </div>
                      <div className={`${styles['text-group_248']} flex-col`}>
                        <span className={`${styles['text_293']}`}>Notice</span>
                        <span className={`${styles['text_294']}`}>提示</span>
                      </div>
                      <div className={`${styles['text-group_249']} flex-col`}>
                        <span className={`${styles['text_295']}`}>Notice2</span>
                        <span className={`${styles['text_296']}`}>提示2</span>
                      </div>
                      <div className={`${styles['text-group_250']} flex-col`}>
                        <div className={`${styles['text-wrapper_82']}`}>
                          <span className={`${styles['text_297']}`}>W</span>
                          <span className={`${styles['text_298']}`}>arning</span>
                        </div>
                        <span className={`${styles['text_299']}`}>警示</span>
                      </div>
                      <div className={`${styles['text-group_251']} flex-col`}>
                        <span className={`${styles['text_300']}`}>Home</span>
                        <span className={`${styles['text_301']}`}>首页</span>
                      </div>
                      <div className={`${styles['text-group_252']} flex-col`}>
                        <span className={`${styles['text_302']}`}>Home1</span>
                        <span className={`${styles['text_303']}`}>首页1</span>
                      </div>
                      <div className={`${styles['text-group_253']} flex-col`}>
                        <span className={`${styles['text_304']}`}>My</span>
                        <span className={`${styles['text_305']}`}>我的</span>
                      </div>
                      <div className={`${styles['text-group_254']} flex-col`}>
                        <span className={`${styles['text_306']}`}>My1</span>
                        <span className={`${styles['text_307']}`}>我的1</span>
                      </div>
                    </div>
                    <div className={`${styles['box_33']} flex-col`}>
                      <img
                        className={`${styles['label_34']}`}
                        src={
                          require('./assets/img/SketchPngaa54320e972b60dbe26919caf64871ec77c1cb56809d689fe1ed0839b25f2fb9.png')
                        }
                      />
                      <div className={`${styles['image-wrapper_13']} flex-col`}>
                        <img
                          className={`${styles['label_35']}`}
                          src={
                            require('./assets/img/SketchPng76c27834e119ac174f7ec25e931c2c2108045e4c1d94a067d648930c015eb896.png')
                          }
                        />
                      </div>
                      <div className={`${styles['image-wrapper_14']} flex-col`}>
                        <img
                          className={`${styles['image_34']}`}
                          src={
                            require('./assets/img/SketchPng81638c3f81b544efec71bd4e2f3ddb2f08e848c01fa2adbe6d8bf41fd2b3f032.png')
                          }
                        />
                      </div>
                      <div className={`${styles['image-wrapper_15']} flex-col`}>
                        <img
                          className={`${styles['image_35']}`}
                          src={
                            require('./assets/img/SketchPng81ebb8b4097173d03b47b6eb4aeda24a3a9fd0471fe5e67fa4fd3f64b086048a.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <img
                    className={`${styles['image_36']}`}
                    src={
                      require('./assets/img/SketchPng98703af7b9dd05b755b937c498cf6e80f09d4848cdb5fc2f09548298c4a462bd.png')
                    }
                  />
                  <div className={`${styles['group_44']} flex-row`}>
                    <div className={`${styles['group_45']} flex-col`}>
                      <div className={`${styles['image-wrapper_16']} flex-col`}>
                        <img
                          className={`${styles['thumbnail_11']}`}
                          src={
                            require('./assets/img/SketchPng718b7d2eb31bd00d88432c1ede8ae931fb6351ccd746dbc7dafe582c8c809592.png')
                          }
                        />
                      </div>
                    </div>
                    <img
                      className={`${styles['label_36']}`}
                      src={
                        require('./assets/img/SketchPng5fbcb5e4158f389f6a834dee59975089261bf1adc5856ebd194682ed193e5cdd.png')
                      }
                    />
                    <div className={`${styles['image-wrapper_84']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_12']}`}
                        src={
                          require('./assets/img/SketchPng2991be2f5f95bc524856e348e36d87b4862883b84d20352d3a9bea5d6e5be25b.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_13']}`}
                        src={
                          require('./assets/img/SketchPng9019cae9bca4384903bcf855b786c5123bf2b0cb61ce82d5771c600c306489c0.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_14']}`}
                        src={
                          require('./assets/img/SketchPng1337855f7054ee377b63ceb3944600e1a5932c7fea3a8fdb4febb2e8f705b17b.png')
                        }
                      />
                    </div>
                    <div className={`${styles['group_46']} flex-col`}>
                      <div className={`${styles['image-wrapper_18']} flex-col`}>
                        <img
                          className={`${styles['image_37']}`}
                          src={
                            require('./assets/img/SketchPng5e0170ea94ee89969b57b8a0bd945de0bc4f09697a051cac97f0b98097666ef4.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['image-wrapper_19']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_15']}`}
                        src={
                          require('./assets/img/SketchPngb20893859eceb07ad4b762c5482db114301802b63a0470e9dd70cb622625a41a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_16']}`}
                        src={
                          require('./assets/img/SketchPng52b64e49226fccf9f2b4814b22f8a3284dba332455d22cc80d66d31c00f84da2.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_17']}`}
                        src={
                          require('./assets/img/SketchPng7957c0488b22dde8dc40c70e93963e4e0a13fbcbef035e362d08323629d834db.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-wrapper_20']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_18']}`}
                        src={
                          require('./assets/img/SketchPng7bf8ab9e3861601b279fc2c89a92a3976eb488e0e8714a1c8d3ba05931251fe3.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_19']}`}
                        src={
                          require('./assets/img/SketchPng1c6ee7c0ab79bdcc1cb43d0b5f052a0a5cdf41324478b9b1f0eb0de0b065a7e0.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['label_37']}`}
                      src={
                        require('./assets/img/SketchPngf8536f4418e74db7b3800134b0c66beb5cba75e4f597513847140c4d5c7e97db.png')
                      }
                    />
                    <div className={`${styles['image-wrapper_21']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_20']}`}
                        src={
                          require('./assets/img/SketchPng4ace9ba540c06809201b3735fd33d63b5049c72f3e25c31692b4ee139c3919c1.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['group_47']} flex-col`}>
                    <div className={`${styles['group_286']} flex-row justify-between`}>
                      <div className={`${styles['box_34']} flex-col`}>
                        <div className={`${styles['box_35']} flex-col`}>
                          <div className={`${styles['image-wrapper_22']} flex-col`}>
                            <img
                              className={`${styles['image_38']}`}
                              src={
                                require('./assets/img/SketchPng657a7cd57b6429b48e1d59cc20d3a7cccaefbbeefee5392d7f06470c1bf9a7ea.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_39']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_40']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_41']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <div className={`${styles['box_36']} flex-col`}>
                          <div className={`${styles['block_20']} flex-col`}>
                            <div className={`${styles['image-wrapper_23']} flex-col`}>
                              <img
                                className={`${styles['image_42']}`}
                                src={
                                  require('./assets/img/SketchPng657a7cd57b6429b48e1d59cc20d3a7cccaefbbeefee5392d7f06470c1bf9a7ea.png')
                                }
                              />
                              <img
                                className={`${styles['image_43']}`}
                                src={
                                  require('./assets/img/SketchPng2bdf9e1f15a0041001445e81330b4f677f84d1690175e74cd7b0f4a76c6fb4ad.png')
                                }
                              />
                              <img
                                className={`${styles['image_44']}`}
                                src={
                                  require('./assets/img/SketchPng657a7cd57b6429b48e1d59cc20d3a7cccaefbbeefee5392d7f06470c1bf9a7ea.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_37']} flex-col`}>
                        <div className={`${styles['block_21']} flex-col`}>
                          <div className={`${styles['image-wrapper_24']} flex-col`}>
                            <img
                              className={`${styles['image_45']}`}
                              src={
                                require('./assets/img/SketchPngc77f590d6d1f2798263497d3e14dacd0c9bf257c8f2e2993a319d19ed204d83e.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_46']}`}
                          src={
                            require('./assets/img/SketchPngd64718f99523b5dcda836cc710dc95412e7952b653997270b0cf78ee17a38008.png')
                          }
                        />
                        <img
                          className={`${styles['image_47']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_48']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <div className={`${styles['block_22']} flex-col`}>
                          <div className={`${styles['block_23']} flex-col`}>
                            <div className={`${styles['image-wrapper_25']} flex-col`}>
                              <img
                                className={`${styles['image_49']}`}
                                src={
                                  require('./assets/img/SketchPng766341916b1f6228a5aeb7702298e5fa557ef344c90a562029fde06a74f3fd84.png')
                                }
                              />
                              <img
                                className={`${styles['image_50']}`}
                                src={
                                  require('./assets/img/SketchPng31703d5305f85b1ab9d0d6b0268349a2a12de2c11d990f7961a8c56d67324350.png')
                                }
                              />
                              <img
                                className={`${styles['image_51']}`}
                                src={
                                  require('./assets/img/SketchPng766341916b1f6228a5aeb7702298e5fa557ef344c90a562029fde06a74f3fd84.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_38']} flex-col`}>
                        <div className={`${styles['group_48']} flex-col`}>
                          <div className={`${styles['image-wrapper_26']} flex-col`}>
                            <img
                              className={`${styles['image_52']}`}
                              src={
                                require('./assets/img/SketchPng65a033c711bf9f9afb1854af25c330d98b3f37834c2db68a2b22cf510f7b24ab.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_53']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_54']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_55']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <div className={`${styles['group_49']} flex-col`}>
                          <div className={`${styles['box_39']} flex-col`}>
                            <div className={`${styles['image-wrapper_27']} flex-col`}>
                              <img
                                className={`${styles['image_56']}`}
                                src={
                                  require('./assets/img/SketchPng65a033c711bf9f9afb1854af25c330d98b3f37834c2db68a2b22cf510f7b24ab.png')
                                }
                              />
                              <img
                                className={`${styles['image_57']}`}
                                src={
                                  require('./assets/img/SketchPngc368f31dadc862b788bd53117490b0f71800c40be4c5147a39c3c0d08d4f1118.png')
                                }
                              />
                              <img
                                className={`${styles['image_58']}`}
                                src={
                                  require('./assets/img/SketchPng65a033c711bf9f9afb1854af25c330d98b3f37834c2db68a2b22cf510f7b24ab.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_40']} flex-col`}>
                        <div className={`${styles['block_24']} flex-col`}>
                          <div className={`${styles['image-wrapper_28']} flex-col`}>
                            <img
                              className={`${styles['image_59']}`}
                              src={
                                require('./assets/img/SketchPng68f68833297d752e38077577c0df9647d38856df87b42015428ff7711a8fd9df.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_60']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_61']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_62']}`}
                          src={
                            require('./assets/img/SketchPngde6b5da6737ff0e850f91dc96580334ee52f264314c5c12361b1ee8a5f7ddb1a.png')
                          }
                        />
                        <div className={`${styles['block_25']} flex-col`}>
                          <div className={`${styles['block_26']} flex-col`}>
                            <div className={`${styles['image-wrapper_29']} flex-col`}>
                              <img
                                className={`${styles['image_63']}`}
                                src={
                                  require('./assets/img/SketchPng68f68833297d752e38077577c0df9647d38856df87b42015428ff7711a8fd9df.png')
                                }
                              />
                              <img
                                className={`${styles['image_64']}`}
                                src={
                                  require('./assets/img/SketchPng7b167f85c4b5c987555a57e4151308e6686a667062a936656721f0e0ebc61aa9.png')
                                }
                              />
                              <img
                                className={`${styles['image_65']}`}
                                src={
                                  require('./assets/img/SketchPng68f68833297d752e38077577c0df9647d38856df87b42015428ff7711a8fd9df.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_41']} flex-col`}>
                        <div className={`${styles['section_19']} flex-col`}>
                          <div className={`${styles['image-wrapper_30']} flex-col`}>
                            <img
                              className={`${styles['image_66']}`}
                              src={
                                require('./assets/img/SketchPng9cddb708fdc5617698cacb85f98018ec40712e20799ab7a406ce31e3624df2a3.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_67']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_68']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_69']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <div className={`${styles['section_20']} flex-col`}>
                          <div className={`${styles['block_27']} flex-col`}>
                            <div className={`${styles['image-wrapper_31']} flex-col`}>
                              <img
                                className={`${styles['image_70']}`}
                                src={
                                  require('./assets/img/SketchPng9cddb708fdc5617698cacb85f98018ec40712e20799ab7a406ce31e3624df2a3.png')
                                }
                              />
                              <img
                                className={`${styles['image_71']}`}
                                src={
                                  require('./assets/img/SketchPng5cc90bbb0f4a652e8d9b145b6e5e4a005a57218d519b8ff2427cd4a381d32d2d.png')
                                }
                              />
                              <img
                                className={`${styles['image_72']}`}
                                src={
                                  require('./assets/img/SketchPng9cddb708fdc5617698cacb85f98018ec40712e20799ab7a406ce31e3624df2a3.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_42']} flex-col`}>
                        <div className={`${styles['section_21']} flex-col`}>
                          <div className={`${styles['image-wrapper_32']} flex-col`}>
                            <img
                              className={`${styles['image_73']}`}
                              src={
                                require('./assets/img/SketchPng3b74f6a364199acf80266732b07a1153d8827f5794b7d06c3a59c306adb8a5ce.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_74']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_75']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_76']}`}
                          src={
                            require('./assets/img/SketchPngb6440d1bc976d30cf81c531ebde949e518c0b81c1c1888dd741d0a974c6881d9.png')
                          }
                        />
                        <div className={`${styles['section_22']} flex-col`}>
                          <div className={`${styles['box_43']} flex-col`}>
                            <div className={`${styles['image-wrapper_33']} flex-col`}>
                              <img
                                className={`${styles['image_77']}`}
                                src={
                                  require('./assets/img/SketchPng3b74f6a364199acf80266732b07a1153d8827f5794b7d06c3a59c306adb8a5ce.png')
                                }
                              />
                              <img
                                className={`${styles['image_78']}`}
                                src={
                                  require('./assets/img/SketchPnge1e059e1d07d1dc97319911820162378045e6070ce387178373b54a795e5363b.png')
                                }
                              />
                              <img
                                className={`${styles['image_79']}`}
                                src={
                                  require('./assets/img/SketchPng3b74f6a364199acf80266732b07a1153d8827f5794b7d06c3a59c306adb8a5ce.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_44']} flex-col`}>
                        <div className={`${styles['group_50']} flex-col`}>
                          <div className={`${styles['image-wrapper_34']} flex-col`}>
                            <img
                              className={`${styles['image_80']}`}
                              src={
                                require('./assets/img/SketchPng81aa4ca6a2316d0d9687649da45d0db2c561a5b2eda7508ab65988d6f9871ade.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_81']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_82']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_83']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <div className={`${styles['group_51']} flex-col`}>
                          <div className={`${styles['box_45']} flex-col`}>
                            <div className={`${styles['image-wrapper_35']} flex-col`}>
                              <img
                                className={`${styles['image_84']}`}
                                src={
                                  require('./assets/img/SketchPng81aa4ca6a2316d0d9687649da45d0db2c561a5b2eda7508ab65988d6f9871ade.png')
                                }
                              />
                              <img
                                className={`${styles['image_85']}`}
                                src={
                                  require('./assets/img/SketchPng85ab9c0198819c8ecc1a8bf5cb405e666b12be7d14a604173b406ee724cc1fee.png')
                                }
                              />
                              <img
                                className={`${styles['image_86']}`}
                                src={
                                  require('./assets/img/SketchPng81aa4ca6a2316d0d9687649da45d0db2c561a5b2eda7508ab65988d6f9871ade.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_46']} flex-col`}>
                        <div className={`${styles['block_28']} flex-col`}>
                          <div className={`${styles['image-wrapper_36']} flex-col`}>
                            <img
                              className={`${styles['image_87']}`}
                              src={
                                require('./assets/img/SketchPng788a3e52b73551c7d3df2700d45c7146700235eb3ca82b7fe5e5dc4e68debfd3.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_88']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <img
                          className={`${styles['image_89']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_90']}`}
                          src={
                            require('./assets/img/SketchPngaede2d1b27c0326f266a0c02c6e4edc56206ddec940c42dcf1f86f9410b43820.png')
                          }
                        />
                        <div className={`${styles['block_29']} flex-col`}>
                          <div className={`${styles['block_30']} flex-col`}>
                            <div className={`${styles['image-wrapper_37']} flex-col`}>
                              <img
                                className={`${styles['image_91']}`}
                                src={
                                  require('./assets/img/SketchPng788a3e52b73551c7d3df2700d45c7146700235eb3ca82b7fe5e5dc4e68debfd3.png')
                                }
                              />
                              <img
                                className={`${styles['image_92']}`}
                                src={
                                  require('./assets/img/SketchPng7b167f85c4b5c987555a57e4151308e6686a667062a936656721f0e0ebc61aa9.png')
                                }
                              />
                              <img
                                className={`${styles['image_93']}`}
                                src={
                                  require('./assets/img/SketchPng788a3e52b73551c7d3df2700d45c7146700235eb3ca82b7fe5e5dc4e68debfd3.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_47']} flex-col`}>
                        <div className={`${styles['box_48']} flex-col`}>
                          <div className={`${styles['image-wrapper_38']} flex-col`}>
                            <img
                              className={`${styles['image_94']}`}
                              src={
                                require('./assets/img/SketchPng281754738057257715902f654b0e97beca5e9cb0377e29655dd7a902c1c1f8b7.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_95']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_96']}`}
                          src={
                            require('./assets/img/SketchPngad1619a4f2bdf7e00fbf1f59c53f90cba5feaec2a1831ff6d5048923557b0d43.png')
                          }
                        />
                        <img
                          className={`${styles['image_97']}`}
                          src={
                            require('./assets/img/SketchPnge7b02c1ec9ae46b005d184297dd4f1fffd0272f38f7c2c127d301299e62edb71.png')
                          }
                        />
                        <div className={`${styles['box_49']} flex-col`}>
                          <div className={`${styles['group_52']} flex-col`}>
                            <div className={`${styles['image-wrapper_39']} flex-col`}>
                              <img
                                className={`${styles['image_98']}`}
                                src={
                                  require('./assets/img/SketchPng281754738057257715902f654b0e97beca5e9cb0377e29655dd7a902c1c1f8b7.png')
                                }
                              />
                              <img
                                className={`${styles['image_99']}`}
                                src={
                                  require('./assets/img/SketchPng2e57dd2eeefc4ee9e3eb8b6c63285c60eac67ad232a8f9bb029c7d277ee08f05.png')
                                }
                              />
                              <img
                                className={`${styles['image_100']}`}
                                src={
                                  require('./assets/img/SketchPng281754738057257715902f654b0e97beca5e9cb0377e29655dd7a902c1c1f8b7.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles['box_50']} flex-col`}>
                        <div className={`${styles['box_51']} flex-col`}>
                          <div className={`${styles['image-wrapper_40']} flex-col`}>
                            <img
                              className={`${styles['image_101']}`}
                              src={
                                require('./assets/img/SketchPngd83de298ece67bf04f3bb0073384f637781a90f9912882d258780ee434132bdb.png')
                              }
                            />
                          </div>
                        </div>
                        <img
                          className={`${styles['image_102']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_103']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <img
                          className={`${styles['image_104']}`}
                          src={
                            require('./assets/img/SketchPng1512d804f05b73641b37e7d532f80f2156c28a42e52637209bbf63984ab853ac.png')
                          }
                        />
                        <div className={`${styles['box_52']} flex-col`}>
                          <div className={`${styles['box_53']} flex-col`}>
                            <div className={`${styles['image-wrapper_41']} flex-col`}>
                              <img
                                className={`${styles['image_105']}`}
                                src={
                                  require('./assets/img/SketchPngd83de298ece67bf04f3bb0073384f637781a90f9912882d258780ee434132bdb.png')
                                }
                              />
                              <img
                                className={`${styles['image_106']}`}
                                src={
                                  require('./assets/img/SketchPng72873236910de17ec0a1d39e15286ccdbd5dcff30d55c45c50f7603669d445b8.png')
                                }
                              />
                              <img
                                className={`${styles['image_107']}`}
                                src={
                                  require('./assets/img/SketchPngd83de298ece67bf04f3bb0073384f637781a90f9912882d258780ee434132bdb.png')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles['group_287']} flex-row`}>
                      <div className={`${styles['text-group_255']} flex-col justify-between`}>
                        <span className={`${styles['text_308']}`}>问题反馈</span>
                        <div className={`${styles['text-wrapper_83']}`}>
                          <span className={`${styles['text_309']}`}>F</span>
                          <span className={`${styles['text_310']}`}>eedback</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_256']} flex-col justify-between`}>
                        <span className={`${styles['text_311']}`}>官网</span>
                        <div className={`${styles['text-wrapper_84']}`}>
                          <span className={`${styles['text_312']}`}>W</span>
                          <span className={`${styles['text_313']}`}>ebsi</span>
                          <span className={`${styles['text_314']}`}>t</span>
                          <span className={`${styles['text_315']}`}>e</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_257']} flex-col justify-between`}>
                        <span className={`${styles['text_316']}`}>语音</span>
                        <div className={`${styles['text-wrapper_85']}`}>
                          <span className={`${styles['text_317']}`}>V</span>
                          <span className={`${styles['text_318']}`}>oice</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_258']} flex-col justify-between`}>
                        <span className={`${styles['text_319']}`}>分享2</span>
                        <div className={`${styles['text-wrapper_86']}`}>
                          <span className={`${styles['text_320']}`}>Sha</span>
                          <span className={`${styles['text_321']}`}>r</span>
                          <span className={`${styles['text_322']}`}>e</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_259']} flex-col justify-between`}>
                        <span className={`${styles['text_323']}`}>更多2</span>
                        <div className={`${styles['text-wrapper_87']}`}>
                          <span className={`${styles['text_324']}`}>mo</span>
                          <span className={`${styles['text_325']}`}>r</span>
                          <span className={`${styles['text_326']}`}>e</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_260']} flex-col justify-between`}>
                        <span className={`${styles['text_327']}`}>预约/定时</span>
                        <div className={`${styles['text-wrapper_88']}`}>
                          <span className={`${styles['text_328']}`}>P</span>
                          <span className={`${styles['text_329']}`}>r</span>
                          <span className={`${styles['text_330']}`}>eset/Delay</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_261']} flex-col justify-between`}>
                        <span className={`${styles['text_331']}`}>定时开</span>
                        <div className={`${styles['text-wrapper_89']}`}>
                          <span className={`${styles['text_332']}`}>T</span>
                          <span className={`${styles['text_333']}`}>ime</span>
                          <span className={`${styles['text_334']}`}>r</span>
                          <span className={`${styles['text_335']}`}>/&nbsp;On</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_262']} flex-col justify-between`}>
                        <span className={`${styles['text_336']}`}>定时关</span>
                        <div className={`${styles['text-wrapper_90']}`}>
                          <span className={`${styles['text_337']}`}>T</span>
                          <span className={`${styles['text_338']}`}>ime</span>
                          <span className={`${styles['text_339']}`}>r</span>
                          <span className={`${styles['text_340']}`}>/&nbsp;O</span>
                          <span className={`${styles['text_341']}`}>˜</span>
                        </div>
                      </div>
                      <div className={`${styles['text-group_263']} flex-col justify-between`}>
                        <span className={`${styles['text_342']}`}>灯光</span>
                        <span className={`${styles['text_343']}`}>Light</span>
                      </div>
                      <div className={`${styles['text-wrapper_359']} flex-col justify-between`}>
                        <span className={`${styles['text_344']}`}>声音开</span>
                        <span className={`${styles['text_345']}`}>Sound&nbsp;opening</span>
                      </div>
                      <div className={`${styles['group_288']} flex-col justify-between`}>
                        <span className={`${styles['text_346']}`}>静音</span>
                        <div className={`${styles['text-wrapper_92']}`}>
                          <span className={`${styles['text_347']}`}>Sound&nbsp;tu</span>
                          <span className={`${styles['text_348']}`}>r</span>
                          <span className={`${styles['text_349']}`}>ning</span>
                          <span className={`${styles['text_350']}`}>o</span>
                          <span className={`${styles['text_351']}`}>ff</span>
                        </div>
                      </div>
                    </div>
                    <img
                      className={`${styles['image_108']}`}
                      src={
                        require('./assets/img/SketchPngec6ef38927cab4cb0b1a46ae9d412401327197e897005d778abeefa090eeff6a.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <img
                className={`${styles['image_109']}`}
                src={
                  require('./assets/img/SketchPng8e9fd62a4a12033ee6df2bd8a24672fedff450c5ae837899c004b30aad9f0987.png')
                }
              />
            </div>
            <div className={`${styles['section_24']} flex-col`}>
              <span className={`${styles['text_352']}`}>圆角&amp;间距&amp;描边&amp;图标&amp;置灰态&nbsp;other</span>
              <div className={`${styles['block_32']} flex-col`}>
                <div className={`${styles['text-wrapper_360']} flex-row`}>
                  <span className={`${styles['text_353']}`}>08&nbsp;圆角</span>
                </div>
                <div className={`${styles['text-wrapper_361']} flex-row`}>
                  <span className={`${styles['text_354']}`}>4px</span>
                </div>
                <div className={`${styles['group_289']} flex-row`}>
                  <div className={`${styles['block_33']} flex-col`}>
                    <div className={`${styles['section_25']} flex-col`} />
                  </div>
                  <span className={`${styles['text_355']}`}>小</span>
                  <span className={`${styles['text_356']}`}>迷你按钮</span>
                </div>
                <div className={`${styles['text-wrapper_362']} flex-row`}>
                  <span className={`${styles['text_357']}`}>8px</span>
                </div>
                <div className={`${styles['group_290']} flex-row`}>
                  <div className={`${styles['box_56']} flex-col`}>
                    <div className={`${styles['group_53']} flex-col`} />
                  </div>
                  <span className={`${styles['text_358']}`}>中</span>
                  <span className={`${styles['text_359']}`}>常规按钮</span>
                </div>
                <div className={`${styles['text-wrapper_363']} flex-row`}>
                  <span className={`${styles['text_360']}`}>12px</span>
                </div>
                <div className={`${styles['group_291']} flex-row`}>
                  <div className={`${styles['section_26']} flex-col`}>
                    <div className={`${styles['block_34']} flex-col`} />
                  </div>
                  <span className={`${styles['text_361']}`}>大</span>
                  <span className={`${styles['text_362']}`}>常规卡片</span>
                </div>
                <div className={`${styles['group_292']} flex-row`}>
                  <img
                    className={`${styles['image_110']}`}
                    src={
                      require('./assets/img/SketchPng49a5f599201ebfde70278c530b5557b18d5c57dd5292fa6cb5cd014200b95c82.png')
                    }
                  />
                  <span className={`${styles['text_363']}`}>圆</span>
                  <span className={`${styles['text_364']}`}>tost/特殊组件</span>
                </div>
                <div className={`${styles['group_293']} flex-row`}>
                  <div className={`${styles['box_60']} flex-col`}>
                    <div className={`${styles['box_61']} flex-col`} />
                  </div>
                  <img
                    className={`${styles['image_111']}`}
                    src={
                      require('./assets/img/SketchPngcd69f2b9fd9acfafa12ca130b3e916136019ee35a803954938d7b24305eac49e.png')
                    }
                  />
                  <span className={`${styles['text_365']}`}>超大</span>
                  <span className={`${styles['text_366']}`}>抽屉</span>
                </div>
                <div className={`${styles['text-wrapper_364']} flex-row`}>
                  <span className={`${styles['text_367']}`}>28px</span>
                </div>
                <img
                  className={`${styles['image_112']}`}
                  src={
                    require('./assets/img/SketchPng4ff90cc0fca3fa2ca33baf277512398f25a1d4452aa76f5c1cc2288f85d163bf.png')
                  }
                />
                <img
                  className={`${styles['image_113']}`}
                  src={
                    require('./assets/img/SketchPng3e679fac03b6035c2f348e5b9b57693d874035683b50293c56c5e10d9a4abc86.png')
                  }
                />
                <img
                  className={`${styles['image_114']}`}
                  src={
                    require('./assets/img/SketchPngcd69f2b9fd9acfafa12ca130b3e916136019ee35a803954938d7b24305eac49e.png')
                  }
                />
              </div>
              <div className={`${styles['block_35']} flex-col`}>
                <div className={`${styles['text-wrapper_365']} flex-row`}>
                  <span className={`${styles['text_368']}`}>09&nbsp;间距</span>
                </div>
                <div className={`${styles['block_151']} flex-row`}>
                  <img
                    className={`${styles['image_115']}`}
                    src={
                      require('./assets/img/SketchPng5f6ee183e537ecb439f61ffac5867e93bf6263e47a70aca063e22fc0bf9a08f1.png')
                    }
                  />
                  <div className={`${styles['box_262']} flex-col`}>
                    <img
                      className={`${styles['image_116']}`}
                      src={
                        require('./assets/img/SketchPngcd69f2b9fd9acfafa12ca130b3e916136019ee35a803954938d7b24305eac49e.png')
                      }
                    />
                    <span className={`${styles['text_369']}`}>10px</span>
                  </div>
                  <img
                    className={`${styles['image_117']}`}
                    src={
                      require('./assets/img/SketchPnge3e4d8adea42a44da95200413d47fb9c2a7f0a28b46345740412c088c12dd9e9.png')
                    }
                  />
                  <div className={`${styles['box_263']} flex-col`}>
                    <img
                      className={`${styles['image_118']}`}
                      src={
                        require('./assets/img/SketchPngcd69f2b9fd9acfafa12ca130b3e916136019ee35a803954938d7b24305eac49e.png')
                      }
                    />
                    <span className={`${styles['text_370']}`}>16px</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_366']} flex-row`}>
                  <span className={`${styles['text_371']}`}>水平间距&nbsp;-&nbsp;卡片组</span>
                  <span className={`${styles['text_372']}`}>水平大间距&nbsp;-&nbsp;板块</span>
                </div>
                <div className={`${styles['block_152']} flex-row justify-between`}>
                  <div className={`${styles['block_153']} flex-col`}>
                    <img
                      className={`${styles['image_119']}`}
                      src={
                        require('./assets/img/SketchPngcd69f2b9fd9acfafa12ca130b3e916136019ee35a803954938d7b24305eac49e.png')
                      }
                    />
                    <span className={`${styles['text_373']}`}>10px</span>
                  </div>
                  <div className={`${styles['block_154']} flex-col`}>
                    <img
                      className={`${styles['image_120']}`}
                      src={
                        require('./assets/img/SketchPngcd69f2b9fd9acfafa12ca130b3e916136019ee35a803954938d7b24305eac49e.png')
                      }
                    />
                    <span className={`${styles['text_374']}`}>16px</span>
                  </div>
                </div>
                <div className={`${styles['block_155']} flex-row justify-between`}>
                  <div className={`${styles['image-text_175']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_121']}`}
                      src={
                        require('./assets/img/SketchPng4fc816a8e698a2e115b8be69540889e08e6e7fb1d9e95b74a4f79913793420c7.png')
                      }
                    />
                    <span className={`${styles['text-group_40']}`}>垂直间距&nbsp;-&nbsp;卡片组</span>
                  </div>
                  <div className={`${styles['box_264']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_122']}`}
                      src={
                        require('./assets/img/SketchPng994eaa2cd0697e83c5006487099b80a7bc9a9c357cfe45cacf76d07467e9676c.png')
                      }
                    />
                    <span className={`${styles['text_375']}`}>垂直大间距&nbsp;-&nbsp;板块</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['block_41']} flex-col`}>
                <div className={`${styles['text-wrapper_367']} flex-row`}>
                  <span className={`${styles['text_376']}`}>10&nbsp;描边</span>
                </div>
                <div className={`${styles['group_294']} flex-row justify-between`}>
                  <div className={`${styles['section_27']} flex-col`} />
                  <span className={`${styles['text_377']}`}>标准</span>
                </div>
                <div className={`${styles['group_295']} flex-row justify-between`}>
                  <div className={`${styles['group_54']} flex-col`} />
                  <span className={`${styles['text_378']}`}>粗</span>
                </div>
              </div>
              <div className={`${styles['block_42']} flex-col`}>
                <div className={`${styles['text-wrapper_368']} flex-row`}>
                  <span className={`${styles['text_379']}`}>11&nbsp;图标尺寸</span>
                </div>
                <div className={`${styles['section_105']} flex-row justify-between`}>
                  <span className={`${styles['text_380']}`}>大</span>
                  <div className={`${styles['section_28']} flex-col`} />
                  <span className={`${styles['text_381']}`}>64px</span>
                </div>
                <div className={`${styles['section_106']} flex-row justify-between`}>
                  <span className={`${styles['text_382']}`}>中</span>
                  <div className={`${styles['box_67']} flex-col`} />
                  <span className={`${styles['text_383']}`}>56px</span>
                </div>
                <div className={`${styles['section_107']} flex-row`}>
                  <span className={`${styles['text_384']}`}>小</span>
                  <div className={`${styles['group_55']} flex-col`} />
                  <span className={`${styles['text_385']}`}>48px</span>
                </div>
                <div className={`${styles['section_108']} flex-row`}>
                  <span className={`${styles['text_386']}`}>特小</span>
                  <div className={`${styles['group_56']} flex-col`} />
                  <span className={`${styles['text_387']}`}>36px</span>
                </div>
              </div>
              <div className={`${styles['block_47']} flex-col`}>
                <div className={`${styles['text-wrapper_369']} flex-row`}>
                  <span className={`${styles['text_388']}`}>12&nbsp;置灰态</span>
                </div>
                <div className={`${styles['group_296']} flex-row`}>
                  <div className={`${styles['text-wrapper_103']} flex-col`}>
                    <span className={`${styles['text_389']}`}>BUTTON</span>
                  </div>
                  <span className={`${styles['text_390']}`}>不透明度20%</span>
                  <div className={`${styles['text-wrapper_104']} flex-col`}>
                    <span className={`${styles['text_391']}`}>BUTTON</span>
                  </div>
                  <span className={`${styles['text_392']}`}>不透明度20%</span>
                </div>
              </div>
            </div>
          </div>
          <span className={`${styles['text_393']}`}>主视信息展示区</span>
          <div className={`${styles['box_68']} flex-col`}>
            <div className={`${styles['group_297']} flex-row`}>
              <div className={`${styles['box_265']} flex-col justify-between`}>
                <span className={`${styles['text_394']}`}>提示和警告通栏</span>
                <div className={`${styles['box_69']} flex-col`}>
                  <div className={`${styles['box_70']} flex-row justify-between`}>
                    <div className={`${styles['image-text_176']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_21']}`}
                        src={
                          require('./assets/img/SketchPnge90c36c2eb1aaff4bfd5b2d89f4b5efa84d287ef553589a6a537ca71e8bba932.png')
                        }
                      />
                      <span className={`${styles['text-group_41']}`}>提示：注意事项，文案自定</span>
                    </div>
                    <div className={`${styles['text-wrapper_105']} flex-col`}>
                      <span className={`${styles['text_395']}`}>操作按钮</span>
                    </div>
                  </div>
                  <div className={`${styles['box_71']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_22']}`}
                      src={
                        require('./assets/img/SketchPnge90c36c2eb1aaff4bfd5b2d89f4b5efa84d287ef553589a6a537ca71e8bba932.png')
                      }
                    />
                    <div className={`${styles['image-text_177']} flex-row justify-between`}>
                      <span className={`${styles['text-group_42']}`}>提示：注意事项，文案自定，文案文案文案文案文案文案</span>
                      <div className={`${styles['text-wrapper_106']} flex-col`}>
                        <span className={`${styles['text_396']}`}>操作按钮</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_72']} flex-row justify-between`}>
                    <div className={`${styles['image-text_178']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_23']}`}
                        src={
                          require('./assets/img/SketchPnge90c36c2eb1aaff4bfd5b2d89f4b5efa84d287ef553589a6a537ca71e8bba932.png')
                        }
                      />
                      <span className={`${styles['text-group_43']}`}>提示：注意事项，文案自定，可关闭</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_24']}`}
                      src={
                        require('./assets/img/SketchPng95158a0aff2326dff0fcd586397e7a0af3b3370eac24ee3d567579e2e3cfc099.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_73']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_25']}`}
                      src={
                        require('./assets/img/SketchPnge90c36c2eb1aaff4bfd5b2d89f4b5efa84d287ef553589a6a537ca71e8bba932.png')
                      }
                    />
                    <div className={`${styles['image-text_179']} flex-row justify-between`}>
                      <span className={`${styles['text-group_44']}`}>提示：注意事项，文案自定，文案文案文案文案文案文案，可关闭</span>
                      <img
                        className={`${styles['thumbnail_26']}`}
                        src={
                          require('./assets/img/SketchPng95158a0aff2326dff0fcd586397e7a0af3b3370eac24ee3d567579e2e3cfc099.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['box_74']} flex-row`}>
                    <img
                      className={`${styles['thumbnail_27']}`}
                      src={
                        require('./assets/img/SketchPng0f48463a6ae05d99cec5f5d3babee5886fa645e2a634f561b4ffc84e9b3d84d5.png')
                      }
                    />
                    <div className={`${styles['image-text_180']} flex-row justify-between`}>
                      <span className={`${styles['text-group_45']}`}>提示：注意事项，文案自定，可关闭</span>
                      <div className={`${styles['text-wrapper_107']} flex-col`}>
                        <span className={`${styles['text_397']}`}>操作按钮</span>
                      </div>
                    </div>
                    <img
                      className={`${styles['thumbnail_28']}`}
                      src={
                        require('./assets/img/SketchPng95158a0aff2326dff0fcd586397e7a0af3b3370eac24ee3d567579e2e3cfc099.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_75']} flex-row`}>
                    <img
                      className={`${styles['thumbnail_29']}`}
                      src={
                        require('./assets/img/SketchPnge90c36c2eb1aaff4bfd5b2d89f4b5efa84d287ef553589a6a537ca71e8bba932.png')
                      }
                    />
                    <div className={`${styles['image-text_181']} flex-row justify-between`}>
                      <span className={`${styles['text-group_46']}`}>
                        提示：注意事项，文案自定，文案文案文案文案文案文案，带操作可关闭
                      </span>
                      <div className={`${styles['text-wrapper_108']} flex-col`}>
                        <span className={`${styles['text_398']}`}>操作按钮</span>
                      </div>
                    </div>
                    <img
                      className={`${styles['thumbnail_30']}`}
                      src={
                        require('./assets/img/SketchPng95158a0aff2326dff0fcd586397e7a0af3b3370eac24ee3d567579e2e3cfc099.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_76']} flex-row`}>
                    <div className={`${styles['image-text_182']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_31']}`}
                        src={
                          require('./assets/img/SketchPng0f48463a6ae05d99cec5f5d3babee5886fa645e2a634f561b4ffc84e9b3d84d5.png')
                        }
                      />
                      <span className={`${styles['text-group_47']}`}>提示：注意事项，文案自定</span>
                    </div>
                  </div>
                  <div className={`${styles['box_77']} flex-row justify-between`}>
                    <div className={`${styles['image-text_183']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_32']}`}
                        src={
                          require('./assets/img/SketchPng440e557f8e0afb030d34aeb2b88b4be5d93e57fb9dafaac58cf558be90583ced.png')
                        }
                      />
                      <span className={`${styles['text-group_48']}`}>提示：注意事项，文案自定</span>
                    </div>
                    <div className={`${styles['text-wrapper_109']} flex-col`}>
                      <span className={`${styles['text_399']}`}>操作按钮</span>
                    </div>
                  </div>
                  <div className={`${styles['box_78']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_33']}`}
                      src={
                        require('./assets/img/SketchPng440e557f8e0afb030d34aeb2b88b4be5d93e57fb9dafaac58cf558be90583ced.png')
                      }
                    />
                    <div className={`${styles['image-text_184']} flex-row justify-between`}>
                      <span className={`${styles['text-group_49']}`}>提示：注意事项，文案自定，文案文案文案文案文案文案</span>
                      <div className={`${styles['text-wrapper_110']} flex-col`}>
                        <span className={`${styles['text_400']}`}>操作按钮</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_79']} flex-row justify-between`}>
                    <div className={`${styles['image-text_185']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_34']}`}
                        src={
                          require('./assets/img/SketchPng440e557f8e0afb030d34aeb2b88b4be5d93e57fb9dafaac58cf558be90583ced.png')
                        }
                      />
                      <span className={`${styles['text-group_50']}`}>提示：注意事项，文案自定，可关闭</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_35']}`}
                      src={
                        require('./assets/img/SketchPng5c731ed550f874566c1b0e94cfd7de54010f83feef64b7e253a9111e43b6f4f8.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_80']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_36']}`}
                      src={
                        require('./assets/img/SketchPng440e557f8e0afb030d34aeb2b88b4be5d93e57fb9dafaac58cf558be90583ced.png')
                      }
                    />
                    <div className={`${styles['image-text_186']} flex-row justify-between`}>
                      <span className={`${styles['text-group_51']}`}>提示：注意事项，文案自定，文案文案文案文案文案文案，可关闭</span>
                      <img
                        className={`${styles['thumbnail_37']}`}
                        src={
                          require('./assets/img/SketchPng5c731ed550f874566c1b0e94cfd7de54010f83feef64b7e253a9111e43b6f4f8.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['box_81']} flex-row`}>
                    <img
                      className={`${styles['thumbnail_38']}`}
                      src={
                        require('./assets/img/SketchPng3ddb975c8ca9cbebb2362eacb7e099fc238fc3934328c16a555fe2bdb13827e3.png')
                      }
                    />
                    <div className={`${styles['image-text_187']} flex-row justify-between`}>
                      <span className={`${styles['text-group_52']}`}>提示：注意事项，文案自定，可关闭</span>
                      <div className={`${styles['text-wrapper_111']} flex-col`}>
                        <span className={`${styles['text_401']}`}>操作按钮</span>
                      </div>
                    </div>
                    <img
                      className={`${styles['thumbnail_39']}`}
                      src={
                        require('./assets/img/SketchPng5c731ed550f874566c1b0e94cfd7de54010f83feef64b7e253a9111e43b6f4f8.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_82']} flex-row`}>
                    <img
                      className={`${styles['thumbnail_40']}`}
                      src={
                        require('./assets/img/SketchPng440e557f8e0afb030d34aeb2b88b4be5d93e57fb9dafaac58cf558be90583ced.png')
                      }
                    />
                    <div className={`${styles['image-text_188']} flex-row justify-between`}>
                      <span className={`${styles['text-group_53']}`}>
                        提示：注意事项，文案自定，文案文案文案文案文案文案，带操作可关闭
                      </span>
                      <div className={`${styles['text-wrapper_112']} flex-col`}>
                        <span className={`${styles['text_402']}`}>操作按钮</span>
                      </div>
                    </div>
                    <img
                      className={`${styles['thumbnail_41']}`}
                      src={
                        require('./assets/img/SketchPng5c731ed550f874566c1b0e94cfd7de54010f83feef64b7e253a9111e43b6f4f8.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_83']} flex-row`}>
                    <div className={`${styles['image-text_189']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_42']}`}
                        src={
                          require('./assets/img/SketchPng3ddb975c8ca9cbebb2362eacb7e099fc238fc3934328c16a555fe2bdb13827e3.png')
                        }
                      />
                      <span className={`${styles['text-group_54']}`}>提示：注意事项，文案自定</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['box_266']} flex-col`}>
                <span className={`${styles['text_403']}`}>导航栏</span>
                <div className={`${styles['section_109']} flex-row`}>
                  <div className={`${styles['image-text_190']} flex-row justify-between`}>
                    <div className={`${styles['section_110']} flex-col`}>
                      <div className={`${styles['image-wrapper_85']} flex-col`}>
                        <img
                          className={`${styles['label_176']}`}
                          src={
                            require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_264']}`}>设备</span>
                  </div>
                </div>
                <div className={`${styles['section_111']} flex-row justify-between`}>
                  <div className={`${styles['image-wrapper_86']} flex-col`}>
                    <img
                      className={`${styles['label_177']}`}
                      src={
                        require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-text_191']} flex-row justify-between`}>
                    <span className={`${styles['text-group_265']}`}>设备</span>
                    <div className={`${styles['image-wrapper_87']} flex-col`}>
                      <img
                        className={`${styles['label_178']}`}
                        src={
                          require('./assets/img/SketchPng3add0ce3ca0cf99664d4a93ebd1df821bf81d3fb6e9d24253e2c352c996251e8.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_112']} flex-col`}>
                  <div className={`${styles['block_156']} flex-row`}>
                    <div className={`${styles['image-wrapper_88']} flex-col`}>
                      <img
                        className={`${styles['label_179']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text_1048']}`}>空调</span>
                    <span className={`${styles['text_1049']}`}>推荐</span>
                    <div className={`${styles['image-wrapper_89']} flex-col`}>
                      <img
                        className={`${styles['label_180']}`}
                        src={
                          require('./assets/img/SketchPng3add0ce3ca0cf99664d4a93ebd1df821bf81d3fb6e9d24253e2c352c996251e8.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['block_157']} flex-row`}>
                    <div className={`${styles['box_267']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['section_113']} flex-col`}>
                  <div className={`${styles['block_158']} flex-row`}>
                    <div className={`${styles['image-wrapper_90']} flex-col`}>
                      <img
                        className={`${styles['label_181']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text_1050']}`}>洗衣机</span>
                    <span className={`${styles['text_1051']}`}>扫地机</span>
                    <span className={`${styles['text_1052']}`}>微波炉</span>
                    <div className={`${styles['image-wrapper_91']} flex-col`}>
                      <img
                        className={`${styles['label_182']}`}
                        src={
                          require('./assets/img/SketchPng3add0ce3ca0cf99664d4a93ebd1df821bf81d3fb6e9d24253e2c352c996251e8.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['block_159']} flex-row`}>
                    <div className={`${styles['box_268']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['section_114']} flex-row`}>
                  <div className={`${styles['image-wrapper_92']} flex-col`}>
                    <img
                      className={`${styles['label_183']}`}
                      src={
                        require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_269']} flex-col justify-between`}>
                    <span className={`${styles['text_1053']}`}>洗衣机文案…</span>
                    <div className={`${styles['group_298']} flex-col`} />
                  </div>
                  <span className={`${styles['text_1054']}`}>空调扇名字</span>
                  <div className={`${styles['box_270']} flex-row`}>
                    <span className={`${styles['text_1055']}`}>微蒸烤</span>
                    <div className={`${styles['box_271']} flex-col`} />
                    <div className={`${styles['box_272']} flex-col`} />
                  </div>
                  <div className={`${styles['image-wrapper_93']} flex-col`}>
                    <img
                      className={`${styles['label_184']}`}
                      src={
                        require('./assets/img/SketchPng3add0ce3ca0cf99664d4a93ebd1df821bf81d3fb6e9d24253e2c352c996251e8.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['section_115']} flex-row`}>
                  <div className={`${styles['image-wrapper_94']} flex-col`}>
                    <img
                      className={`${styles['label_185']}`}
                      src={
                        require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text_1056']}`}>设备</span>
                  <div className={`${styles['image-wrapper_95']} flex-col`}>
                    <img
                      className={`${styles['label_186']}`}
                      src={
                        require('./assets/img/SketchPng8a5ab2fb5bd0ad7c9abe734401ca3d66b5d629ab47cbad3e7a0e576fdf670d45.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-wrapper_96']} flex-col`}>
                    <img
                      className={`${styles['label_187']}`}
                      src={
                        require('./assets/img/SketchPng3add0ce3ca0cf99664d4a93ebd1df821bf81d3fb6e9d24253e2c352c996251e8.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['section_116']} flex-row`}>
                  <div className={`${styles['image-text_192']} flex-row justify-between`}>
                    <div className={`${styles['image-wrapper_97']} flex-col`}>
                      <img
                        className={`${styles['label_188']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text-group_266']}`}>设备</span>
                  </div>
                  <span className={`${styles['text_1057']}`}>编辑</span>
                </div>
                <div className={`${styles['text-wrapper_370']} flex-row`}>
                  <span className={`${styles['text_1058']}`}>取消</span>
                  <span className={`${styles['text_1059']}`}>设备</span>
                  <span className={`${styles['text_1060']}`}>完成</span>
                </div>
                <div className={`${styles['section_117']} flex-row`}>
                  <div className={`${styles['image-text_193']} flex-row justify-between`}>
                    <div className={`${styles['image-wrapper_98']} flex-col`}>
                      <img
                        className={`${styles['label_189']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_267']} flex-col justify-between`}>
                      <span className={`${styles['text_1061']}`}>标题</span>
                      <span className={`${styles['text_1062']}`}>副标题</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_118']} flex-row justify-between`}>
                  <div className={`${styles['image-wrapper_99']} flex-col`}>
                    <img
                      className={`${styles['label_190']}`}
                      src={
                        require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-text_194']} flex-row justify-between`}>
                    <div className={`${styles['text-group_268']} flex-col justify-between`}>
                      <span className={`${styles['text_1063']}`}>标题</span>
                      <span className={`${styles['text_1064']}`}>副标题</span>
                    </div>
                    <div className={`${styles['image-wrapper_100']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_113']}`}
                        src={
                          require('./assets/img/SketchPng2baff5b51ecd711a418c5061f8499eeb7f08346bfcdce66c1f743b542cba87ba.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_119']} flex-row`}>
                  <div className={`${styles['image-wrapper_101']} flex-col`}>
                    <img
                      className={`${styles['label_191']}`}
                      src={
                        require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-wrapper_371']} flex-col justify-between`}>
                    <span className={`${styles['text_1065']}`}>标题</span>
                    <span className={`${styles['text_1066']}`}>副标题</span>
                  </div>
                  <div className={`${styles['image-wrapper_102']} flex-col`}>
                    <img
                      className={`${styles['label_192']}`}
                      src={
                        require('./assets/img/SketchPng8a5ab2fb5bd0ad7c9abe734401ca3d66b5d629ab47cbad3e7a0e576fdf670d45.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-wrapper_103']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_114']}`}
                      src={
                        require('./assets/img/SketchPng2baff5b51ecd711a418c5061f8499eeb7f08346bfcdce66c1f743b542cba87ba.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['section_120']} flex-row`}>
                  <div className={`${styles['image-text_195']} flex-row justify-between`}>
                    <div className={`${styles['image-wrapper_104']} flex-col`}>
                      <img
                        className={`${styles['label_193']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_269']} flex-col justify-between`}>
                      <span className={`${styles['text_1067']}`}>标题</span>
                      <span className={`${styles['text_1068']}`}>副标题</span>
                    </div>
                  </div>
                  <span className={`${styles['text_1069']}`}>选择</span>
                </div>
              </div>
              <div className={`${styles['box_273']} flex-col`}>
                <span className={`${styles['text_426']}`}>页面Tab</span>
                <div className={`${styles['group_62']} flex-col`}>
                  <div className={`${styles['group_299']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_372']} flex-col`}>
                      <span className={`${styles['text_1070']}`}>左边</span>
                    </div>
                    <div className={`${styles['text-wrapper_373']} flex-col`}>
                      <span className={`${styles['text_1071']}`}>右边</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_64']} flex-col`}>
                  <div className={`${styles['section_121']} flex-col`}>
                    <div className={`${styles['group_300']} flex-row justify-between`}>
                      <div className={`${styles['text-wrapper_374']} flex-col`}>
                        <span className={`${styles['text_1072']}`}>左边</span>
                      </div>
                      <div className={`${styles['text-wrapper_375']} flex-col`}>
                        <span className={`${styles['text_1073']}`}>中间</span>
                      </div>
                      <div className={`${styles['text-wrapper_376']} flex-col`}>
                        <span className={`${styles['text_1074']}`}>右边</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_65']} flex-col`}>
                  <div className={`${styles['block_160']} flex-row justify-between`}>
                    <div className={`${styles['box_274']} flex-row justify-between`}>
                      <div className={`${styles['text-wrapper_377']} flex-col`}>
                        <span className={`${styles['text_1075']}`}>左边</span>
                      </div>
                      <div className={`${styles['text-wrapper_378']} flex-col`}>
                        <span className={`${styles['text_1076']}`}>中间</span>
                      </div>
                      <div className={`${styles['text-wrapper_379']} flex-col`}>
                        <span className={`${styles['text_1077']}`}>中间</span>
                      </div>
                    </div>
                    <div className={`${styles['box_275']} flex-row`}>
                      <img
                        className={`${styles['thumbnail_115']}`}
                        src={
                          require('./assets/img/SketchPngebd8e7159afbbd8971e1e4b0da1b9458d17ac767bbca99c5276e379a0fb2896c.png')
                        }
                      />
                      <span className={`${styles['text_1078']}`}>右边</span>
                    </div>
                  </div>
                </div>
                <span className={`${styles['text_436']}`}>二级页面中&nbsp;Tab</span>
                <div className={`${styles['group_66']} flex-col`}>
                  <div className={`${styles['text-wrapper_380']} flex-row justify-between`}>
                    <span className={`${styles['text_437']}`}>标签</span>
                    <span className={`${styles['text_438']}`}>标签</span>
                  </div>
                  <div className={`${styles['image-wrapper_105']} flex-row`}>
                    <img
                      className={`${styles['image_123']}`}
                      src={
                        require('./assets/img/SketchPng16602408c8de2d59158e5dba91e3d0656277a454c30524d1298c12bf7835885c.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_67']} flex-col`}>
                  <div className={`${styles['text-wrapper_381']} flex-row justify-between`}>
                    <span className={`${styles['text_439']}`}>标签</span>
                    <span className={`${styles['text_440']}`}>标签</span>
                    <span className={`${styles['text_441']}`}>标签</span>
                  </div>
                  <div className={`${styles['image-wrapper_106']} flex-row`}>
                    <img
                      className={`${styles['image_124']}`}
                      src={
                        require('./assets/img/SketchPng16602408c8de2d59158e5dba91e3d0656277a454c30524d1298c12bf7835885c.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_68']} flex-col`}>
                  <div className={`${styles['text-wrapper_382']} flex-row justify-between`}>
                    <span className={`${styles['text_442']}`}>标签</span>
                    <span className={`${styles['text_443']}`}>标签</span>
                    <span className={`${styles['text_444']}`}>标签</span>
                    <span className={`${styles['text_445']}`}>标签</span>
                  </div>
                  <div className={`${styles['image-wrapper_107']} flex-row`}>
                    <img
                      className={`${styles['image_125']}`}
                      src={
                        require('./assets/img/SketchPng16602408c8de2d59158e5dba91e3d0656277a454c30524d1298c12bf7835885c.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_69']} flex-row justify-end`}>
                  <div className={`${styles['group_301']} flex-col justify-between`}>
                    <span className={`${styles['text_446']}`}>空调</span>
                    <div className={`${styles['box_91']} flex-col`} />
                  </div>
                  <span className={`${styles['text_447']}`}>冰箱</span>
                  <span className={`${styles['text_448']}`}>洗衣机</span>
                  <span className={`${styles['text_449']}`}>热水器</span>
                  <span className={`${styles['text_450']}`}>电饭煲</span>
                  <div className={`${styles['box_92']} flex-col`} />
                </div>
                <div className={`${styles['group_70']} flex-row`}>
                  <div className={`${styles['section_34']} flex-col`}>
                    <div className={`${styles['text-wrapper_126']} flex-col`}>
                      <span className={`${styles['text_451']}`}>空调</span>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_127']} flex-col`}>
                    <span className={`${styles['text_452']}`}>冰箱</span>
                  </div>
                  <div className={`${styles['text-wrapper_128']} flex-col`}>
                    <span className={`${styles['text_453']}`}>洗衣机</span>
                  </div>
                  <div className={`${styles['text-wrapper_129']} flex-col`}>
                    <span className={`${styles['text_454']}`}>热水器</span>
                  </div>
                  <div className={`${styles['text-wrapper_130']} flex-col`}>
                    <span className={`${styles['text_455']}`}>电饭煲</span>
                  </div>
                </div>
                <div className={`${styles['group_71']} flex-row`}>
                  <div className={`${styles['box_276']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_131']} flex-col`}>
                      <span className={`${styles['text_456']}`}>今日推荐</span>
                    </div>
                    <div className={`${styles['text-wrapper_132']} flex-col`}>
                      <span className={`${styles['text_457']}`}>新手不翻车</span>
                    </div>
                    <div className={`${styles['text-wrapper_133']} flex-col`}>
                      <span className={`${styles['text_458']}`}>懒人一锅出</span>
                    </div>
                    <div className={`${styles['text-wrapper_134']} flex-col`}>
                      <span className={`${styles['text_459']}`}>甜品控</span>
                    </div>
                  </div>
                  <div className={`${styles['block_66']} flex-col`} />
                  <span className={`${styles['text_460']}`}>早餐达人</span>
                </div>
              </div>
              <div className={`${styles['box_277']} flex-col justify-between`}>
                <span className={`${styles['text_461']}`}>设备状态</span>
                <div className={`${styles['box_93']} flex-col`}>
                  <div className={`${styles['box_278']} flex-row`}>
                    <div className={`${styles['image-text_196']} flex-row justify-between`}>
                      <div className={`${styles['box_279']} flex-col`} />
                      <span className={`${styles['text-group_270']}`}>待机中</span>
                    </div>
                  </div>
                  <div className={`${styles['box_280']} flex-row`}>
                    <div className={`${styles['image-text_197']} flex-row justify-between`}>
                      <div className={`${styles['group_302']} flex-col`} />
                      <span className={`${styles['text-group_271']}`}>制冷中</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_116']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <span className={`${styles['text_1079']}`}>睡眠风</span>
                  </div>
                  <div className={`${styles['box_281']} flex-row`}>
                    <div className={`${styles['image-text_198']} flex-row justify-between`}>
                      <div className={`${styles['box_282']} flex-col`} />
                      <span className={`${styles['text-group_272']}`}>已关机</span>
                    </div>
                  </div>
                  <div className={`${styles['box_283']} flex-row`}>
                    <div className={`${styles['image-text_199']} flex-row justify-between`}>
                      <div className={`${styles['box_284']} flex-col`} />
                      <span className={`${styles['text-group_273']}`}>已离线</span>
                    </div>
                  </div>
                  <div className={`${styles['box_285']} flex-row`}>
                    <div className={`${styles['image-text_200']} flex-row justify-between`}>
                      <div className={`${styles['box_286']} flex-col`} />
                      <span className={`${styles['text-group_274']}`}>在线</span>
                    </div>
                  </div>
                  <div className={`${styles['box_287']} flex-row`}>
                    <div className={`${styles['image-text_201']} flex-row justify-between`}>
                      <div className={`${styles['section_122']} flex-col`} />
                      <span className={`${styles['text-group_275']}`}>离线</span>
                    </div>
                  </div>
                  <div className={`${styles['box_288']} flex-row`}>
                    <div className={`${styles['image-text_202']} flex-row justify-between`}>
                      <div className={`${styles['section_123']} flex-col`} />
                      <span className={`${styles['text-group_276']}`}>制冷中</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_117']}`}
                      src={
                        require('./assets/img/SketchPngf858ea5cbe53dc00d131d10edf77b358a511ced9d230ba43790dd9ad351fdf89.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_383']}`}>
                      <span className={`${styles['text_1080']}`}>预约开机</span>
                      <span className={`${styles['paragraph_24']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1081']}`}>每天</span>
                      <span className={`${styles['text_1082']}`}>06:00</span>
                    </div>
                  </div>
                  <div className={`${styles['box_289']} flex-row`}>
                    <div className={`${styles['image-text_203']} flex-row justify-between`}>
                      <div className={`${styles['group_303']} flex-col`} />
                      <span className={`${styles['text-group_277']}`}>制冷中</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_118']}`}
                      src={
                        require('./assets/img/SketchPngf858ea5cbe53dc00d131d10edf77b358a511ced9d230ba43790dd9ad351fdf89.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_384']}`}>
                      <span className={`${styles['text_1083']}`}>预约加热至&nbsp;75℃</span>
                      <span className={`${styles['paragraph_25']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1084']}`}>明天下午</span>
                      <span className={`${styles['text_1085']}`}>6:00-9:00</span>
                    </div>
                  </div>
                  <div className={`${styles['box_290']} flex-row`}>
                    <div className={`${styles['image-text_204']} flex-row justify-between`}>
                      <div className={`${styles['block_161']} flex-col`} />
                      <span className={`${styles['text-group_278']}`}>已关机</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_119']}`}
                      src={
                        require('./assets/img/SketchPngf858ea5cbe53dc00d131d10edf77b358a511ced9d230ba43790dd9ad351fdf89.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_385']}`}>
                      <span className={`${styles['text_1086']}`}>预约加热至&nbsp;75℃</span>
                      <span className={`${styles['paragraph_26']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1087']}`}>明天下午</span>
                      <span className={`${styles['text_1088']}`}>6:00-9:00</span>
                    </div>
                  </div>
                  <div className={`${styles['box_291']} flex-col`}>
                    <div className={`${styles['text-wrapper_386']}`}>
                      <span className={`${styles['text_1089']}`}>定时开机</span>
                      <span className={`${styles['paragraph_27']}`}>
                        <br />
                        21:30
                      </span>
                    </div>
                  </div>
                  <div className={`${styles['box_292']} flex-col`}>
                    <div className={`${styles['text-wrapper_387']}`}>
                      <span className={`${styles['text_1090']}`}>预约加热至&nbsp;75℃</span>
                      <span className={`${styles['paragraph_28']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1091']}`}>明天下午</span>
                      <span className={`${styles['text_1092']}`}>6:00-9:00</span>
                    </div>
                  </div>
                  <div className={`${styles['box_293']} flex-row`}>
                    <div className={`${styles['text-wrapper_388']}`}>
                      <span className={`${styles['text_1093']}`}>定时开机</span>
                      <span className={`${styles['paragraph_29']}`}>
                        <br />
                        21:30
                      </span>
                    </div>
                    <img
                      className={`${styles['thumbnail_120']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_389']}`}>
                      <span className={`${styles['text_1094']}`}>预约开机</span>
                      <span className={`${styles['paragraph_30']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1095']}`}>每天</span>
                      <span className={`${styles['text_1096']}`}>06:00</span>
                    </div>
                  </div>
                  <div className={`${styles['box_294']} flex-row`}>
                    <div className={`${styles['text-wrapper_390']}`}>
                      <span className={`${styles['text_1097']}`}>定时开机</span>
                      <span className={`${styles['paragraph_31']}`}>
                        <br />
                        21:30
                      </span>
                    </div>
                    <img
                      className={`${styles['thumbnail_121']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_391']}`}>
                      <span className={`${styles['text_1098']}`}>预约开机</span>
                      <span className={`${styles['paragraph_32']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1099']}`}>每天</span>
                      <span className={`${styles['text_1100']}`}>06:00</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_122']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_392']}`}>
                      <span className={`${styles['paragraph_33']}`}>
                        新风定时开
                        <br />
                      </span>
                      <span className={`${styles['text_1101']}`}>21:30</span>
                    </div>
                  </div>
                  <div className={`${styles['box_295']} flex-row`}>
                    <div className={`${styles['text-wrapper_393']}`}>
                      <span className={`${styles['text_1102']}`}>定时开机</span>
                      <span className={`${styles['paragraph_34']}`}>
                        <br />
                        21:30
                      </span>
                    </div>
                    <img
                      className={`${styles['thumbnail_123']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_394']}`}>
                      <span className={`${styles['text_1103']}`}>预约开机</span>
                      <span className={`${styles['paragraph_35']}`}>
                        <br />
                      </span>
                      <span className={`${styles['text_1104']}`}>每天</span>
                      <span className={`${styles['text_1105']}`}>06:00</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_124']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_395']}`}>
                      <span className={`${styles['paragraph_36']}`}>
                        新风定时开
                        <br />
                      </span>
                      <span className={`${styles['text_1106']}`}>21:30</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_125']}`}
                      src={
                        require('./assets/img/SketchPng18d995c9770099621c90f3b5bcb31b68d930e39930bbe2e211607ab0a68a95ac.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_396']}`}>
                      <span className={`${styles['paragraph_37']}`}>
                        新风定时开
                        <br />
                      </span>
                      <span className={`${styles['text_1107']}`}>21:30</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['box_296']} flex-col`}>
                <span className={`${styles['text_491']}`}>设备主信息</span>
                <div className={`${styles['group_92']} flex-col`}>
                  <div className={`${styles['text-wrapper_397']} flex-row justify-between`}>
                    <span className={`${styles['text_492']}`}>45</span>
                    <span className={`${styles['text_493']}`}>%</span>
                  </div>
                  <span className={`${styles['text_494']}`}>室内湿度</span>
                </div>
                <div className={`${styles['group_93']} flex-row`}>
                  <div className={`${styles['group_304']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_398']} flex-row justify-between`}>
                      <span className={`${styles['text_495']}`}>45</span>
                      <span className={`${styles['text_496']}`}>%</span>
                    </div>
                    <span className={`${styles['text_497']}`}>室内湿度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_126']}`}
                    src={
                      require('./assets/img/SketchPng68a941a4fa879b8beee0f878f19b7c0eb4044702bcd6745fc75687cf373d621d.png')
                    }
                  />
                  <div className={`${styles['group_305']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_399']} flex-row justify-between`}>
                      <span className={`${styles['text_498']}`}>52</span>
                      <span className={`${styles['text_499']}`}>%</span>
                    </div>
                    <span className={`${styles['text_500']}`}>室外湿度</span>
                  </div>
                </div>
                <div className={`${styles['group_96']} flex-row`}>
                  <div className={`${styles['section_124']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_400']} flex-row justify-between`}>
                      <span className={`${styles['text_501']}`}>38</span>
                      <span className={`${styles['text_502']}`}>°C</span>
                    </div>
                    <span className={`${styles['text_503']}`}>室外温度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_127']}`}
                    src={
                      require('./assets/img/SketchPng68a941a4fa879b8beee0f878f19b7c0eb4044702bcd6745fc75687cf373d621d.png')
                    }
                  />
                  <div className={`${styles['section_125']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_401']} flex-row justify-between`}>
                      <span className={`${styles['text_504']}`}>21</span>
                      <span className={`${styles['text_505']}`}>°C</span>
                    </div>
                    <span className={`${styles['text_506']}`}>室内温度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_128']}`}
                    src={
                      require('./assets/img/SketchPng68a941a4fa879b8beee0f878f19b7c0eb4044702bcd6745fc75687cf373d621d.png')
                    }
                  />
                  <div className={`${styles['section_126']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_402']} flex-row justify-between`}>
                      <span className={`${styles['text_507']}`}>45</span>
                      <span className={`${styles['text_508']}`}>%</span>
                    </div>
                    <span className={`${styles['text_509']}`}>室内湿度</span>
                  </div>
                </div>
                <div className={`${styles['group_97']} flex-row`}>
                  <div className={`${styles['group_306']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_403']} flex-row justify-between`}>
                      <span className={`${styles['text_510']}`}>38</span>
                      <span className={`${styles['text_511']}`}>°C</span>
                    </div>
                    <span className={`${styles['text_512']}`}>室外温度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_129']}`}
                    src={
                      require('./assets/img/SketchPng68a941a4fa879b8beee0f878f19b7c0eb4044702bcd6745fc75687cf373d621d.png')
                    }
                  />
                  <div className={`${styles['group_307']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_404']} flex-row justify-between`}>
                      <span className={`${styles['text_513']}`}>21</span>
                      <span className={`${styles['text_514']}`}>°C</span>
                    </div>
                    <span className={`${styles['text_515']}`}>室内温度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_130']}`}
                    src={
                      require('./assets/img/SketchPng68a941a4fa879b8beee0f878f19b7c0eb4044702bcd6745fc75687cf373d621d.png')
                    }
                  />
                  <div className={`${styles['group_308']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_405']} flex-row justify-between`}>
                      <span className={`${styles['text_516']}`}>45</span>
                      <span className={`${styles['text_517']}`}>%</span>
                    </div>
                    <span className={`${styles['text_518']}`}>室内湿度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_131']}`}
                    src={
                      require('./assets/img/SketchPng68a941a4fa879b8beee0f878f19b7c0eb4044702bcd6745fc75687cf373d621d.png')
                    }
                  />
                  <div className={`${styles['group_309']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_406']} flex-row justify-between`}>
                      <span className={`${styles['text_519']}`}>52</span>
                      <span className={`${styles['text_520']}`}>%</span>
                    </div>
                    <span className={`${styles['text_521']}`}>室外湿度</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['box_297']} flex-col`}>
                <div className={`${styles['text-group_279']} flex-col`}>
                  <span className={`${styles['text_522']}`}>设备图</span>
                  <span className={`${styles['text_523']}`}>
                    设备图未撑满的格式设计尺寸1&#64;X230px*230px输出尺寸3&#64;X690px*690px
                  </span>
                  <span className={`${styles['text_524']}`}>其他场景设备图根据实际等比调整大小：</span>
                </div>
                <div className={`${styles['group_310']} flex-row justify-between`}>
                  <div className={`${styles['block_72']} flex-col`}>
                    <div className={`${styles['section_39']} flex-col`}>
                      <div className={`${styles['box_98']} flex-col`}>
                        <div className={`${styles['group_99']} flex-col`} />
                      </div>
                      <div className={`${styles['text-wrapper_159']} flex-col`}>
                        <span className={`${styles['text_525']}`}>158*158px</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['block_73']} flex-col`}>
                    <div className={`${styles['group_100']} flex-col`}>
                      <div className={`${styles['text-wrapper_160']} flex-col`}>
                        <span className={`${styles['text_526']}`}>200*118px</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['block_74']} flex-col`}>
                    <div className={`${styles['group_101']} flex-col`}>
                      <div className={`${styles['text-wrapper_161']} flex-col`}>
                        <span className={`${styles['text_527']}`}>158*200px</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_311']} flex-row justify-between`}>
                  <div className={`${styles['section_40']} flex-col`}>
                    <div className={`${styles['image-wrapper_65']} flex-col`}>
                      <img
                        className={`${styles['image_126']}`}
                        src={
                          require('./assets/img/SketchPng24fc7ce83100d5643bacace601815dc21086ef1420c12a4b18f6ae054916b095.png')
                        }
                      />
                    </div>
                    <div className={`${styles['section_41']} flex-row`}>
                      <span className={`${styles['text_528']}`}>9:28</span>
                      <img
                        className={`${styles['thumbnail_62']}`}
                        src={
                          require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_63']}`}
                        src={
                          require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                        }
                      />
                      <img
                        className={`${styles['image_127']}`}
                        src={
                          require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                        }
                      />
                    </div>
                    <div className={`${styles['section_42']} flex-row`}>
                      <img
                        className={`${styles['thumbnail_64']}`}
                        src={
                          require('./assets/img/SketchPng3540f1d0ae1ad0be46d00080a2ab378668c0e1dd355e3a48b0251af79668da9c.png')
                        }
                      />
                      <span className={`${styles['text_529']}`}>方正设备</span>
                      <img
                        className={`${styles['image_128']}`}
                        src={
                          require('./assets/img/SketchPnga90ad7bd4bd9459ead77a93f5c9248a194537f04284612bab1f2a0e801d738c3.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['section_43']} flex-col`}>
                    <div className={`${styles['image-wrapper_66']} flex-col`}>
                      <img
                        className={`${styles['image_129']}`}
                        src={
                          require('./assets/img/SketchPng1f3359b0fd46e5f34948c1ba72e161564086db2dd8946e3d9cf7277ff63e6abe.png')
                        }
                      />
                    </div>
                    <div className={`${styles['group_102']} flex-row`}>
                      <span className={`${styles['text_530']}`}>9:28</span>
                      <img
                        className={`${styles['thumbnail_65']}`}
                        src={
                          require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_66']}`}
                        src={
                          require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                        }
                      />
                      <img
                        className={`${styles['image_130']}`}
                        src={
                          require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                        }
                      />
                    </div>
                    <div className={`${styles['group_103']} flex-row`}>
                      <img
                        className={`${styles['thumbnail_67']}`}
                        src={
                          require('./assets/img/SketchPng3540f1d0ae1ad0be46d00080a2ab378668c0e1dd355e3a48b0251af79668da9c.png')
                        }
                      />
                      <span className={`${styles['text_531']}`}>横向设备</span>
                      <img
                        className={`${styles['image_131']}`}
                        src={
                          require('./assets/img/SketchPnga90ad7bd4bd9459ead77a93f5c9248a194537f04284612bab1f2a0e801d738c3.png')
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_104']} flex-col`}>
                <div className={`${styles['image-wrapper_67']} flex-col`}>
                  <img
                    className={`${styles['image_132']}`}
                    src={
                      require('./assets/img/SketchPnga695b93c473bae1770e8050f3a06b588d5343652477a1eef36ec99b9d9997ca6.png')
                    }
                  />
                </div>
                <div className={`${styles['section_44']} flex-row`}>
                  <span className={`${styles['text_532']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_68']}`}
                    src={
                      require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_69']}`}
                    src={
                      require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                    }
                  />
                  <img
                    className={`${styles['image_133']}`}
                    src={
                      require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                    }
                  />
                </div>
                <div className={`${styles['section_45']} flex-row`}>
                  <img
                    className={`${styles['thumbnail_70']}`}
                    src={
                      require('./assets/img/SketchPng3540f1d0ae1ad0be46d00080a2ab378668c0e1dd355e3a48b0251af79668da9c.png')
                    }
                  />
                  <span className={`${styles['text_533']}`}>竖向设备</span>
                  <img
                    className={`${styles['image_134']}`}
                    src={
                      require('./assets/img/SketchPnga90ad7bd4bd9459ead77a93f5c9248a194537f04284612bab1f2a0e801d738c3.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['group_312']} flex-row justify-between`}>
              <div className={`${styles['block_76']} flex-col`}>
                <div className={`${styles['section_46']} flex-col`}>
                  <div className={`${styles['section_47']} flex-col`} />
                </div>
                <img
                  className={`${styles['image_135']}`}
                  src={
                    require('./assets/img/SketchPnga50249365668d968c07ce3ce5af3e73c36886ea48e963221c3513bf96f03cbe0.png')
                  }
                />
              </div>
              <div className={`${styles['block_77']} flex-col`}>
                <div className={`${styles['group_105']} flex-col`}>
                  <div className={`${styles['group_106']} flex-col`} />
                </div>
                <div className={`${styles['group_107']} flex-col`} />
                <img
                  className={`${styles['image_136']}`}
                  src={
                    require('./assets/img/SketchPngfb338a66eeb9d01d9e5a1f7aa2c32ea9db5daf213065fd15f598b4794f3b7277.png')
                  }
                />
              </div>
              <div className={`${styles['block_78']} flex-col`}>
                <div className={`${styles['group_108']} flex-col`}>
                  <div className={`${styles['box_100']} flex-col`} />
                  <img
                    className={`${styles['image_137']}`}
                    src={
                      require('./assets/img/SketchPng47ed4a43d866f073a0f946e8bc273340955c74abf54265bd86aa67afbca1cb55.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['image-wrapper_68']} flex-col`}>
                <img
                  className={`${styles['image_138']}`}
                  src={
                    require('./assets/img/SketchPngacf7baa3cce0e635a4defd58688ba7e4665111b984fc2786e65f7a7bed6cfa7f.png')
                  }
                />
                <img
                  className={`${styles['image_139']}`}
                  src={
                    require('./assets/img/SketchPng5854733b2a46f09c2c979d71bafd4d790e374e26b37ce725200a6a3430497308.png')
                  }
                />
              </div>
              <div className={`${styles['block_79']} flex-col`}>
                <div className={`${styles['group_109']} flex-col`}>
                  <div className={`${styles['box_101']} flex-col`} />
                  <img
                    className={`${styles['image_140']}`}
                    src={
                      require('./assets/img/SketchPng30d3932f33fae16a1ad54c2f229ecdbe721a903728f89335d2cb0a92901a8049.png')
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <span className={`${styles['text_534']}`}>底部常驻栏与Tost</span>
          <div className={`${styles['box_102']} flex-row`}>
            <div className={`${styles['box_103']} flex-col`}>
              <span className={`${styles['text_535']}`}>排版对齐方式</span>
              <span className={`${styles['text_536']}`}>有4个功能图标排版</span>
              <div className={`${styles['group_110']} flex-row justify-around`}>
                <div className={`${styles['image-text_205']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_56']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_71']}`}>图标名称</span>
                </div>
                <div className={`${styles['image-text_206']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_57']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_72']}`}>图标名称</span>
                </div>
                <div className={`${styles['image-text_207']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_58']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_73']}`}>图标名称</span>
                </div>
                <div className={`${styles['image-text_208']} flex-col justify-between`}>
                  <div className={`${styles['section_48']} flex-col`} />
                  <span className={`${styles['text-group_74']}`}>图标名称</span>
                </div>
              </div>
              <img
                className={`${styles['image_141']}`}
                src={
                  require('./assets/img/SketchPng69dc9cf99bbe33a905add9fcce511069500ec3c6611902718907035b693c81be.png')
                }
              />
              <span className={`${styles['text_537']}`}>有3个功能图标排版</span>
              <div className={`${styles['group_111']} flex-row`}>
                <div className={`${styles['image-text_209']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_59']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_75']}`}>图标名称&nbsp;</span>
                </div>
                <div className={`${styles['image-text_210']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_60']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_76']}`}>图标名称</span>
                </div>
                <div className={`${styles['image-text_211']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_61']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_77']}`}>图标名称</span>
                </div>
              </div>
              <img
                className={`${styles['image_142']}`}
                src={
                  require('./assets/img/SketchPng6f81de15022e316c619e60e76dcae9aa9977d52c788f8ee7c3999fa9eb9a4c38.png')
                }
              />
              <span className={`${styles['text_538']}`}>只有2个功能图标排版</span>
              <div className={`${styles['group_112']} flex-row justify-around`}>
                <div className={`${styles['image-text_212']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_62']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_78']}`}>图标名称&nbsp;</span>
                </div>
                <div className={`${styles['image-text_213']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_63']}`}
                    src={
                      require('./assets/img/SketchPngec69e499b74a43c95a25236b7a1b8bf8ddb4503dc4148a4923badf2f34d95c5e.png')
                    }
                  />
                  <span className={`${styles['text-group_79']}`}>图标名称</span>
                </div>
              </div>
              <img
                className={`${styles['image_143']}`}
                src={
                  require('./assets/img/SketchPngd910c8a02692e1aa681884a740f217560548f9a51f755ecdbdb0329af7d2ef92.png')
                }
              />
              <span className={`${styles['text_539']}`}>底部图标排版保持底部均分形式</span>
            </div>
            <div className={`${styles['box_104']} flex-col`}>
              <div className={`${styles['text-wrapper_407']} flex-row`}>
                <span className={`${styles['text_540']}`}>正常情况</span>
              </div>
              <div className={`${styles['text-wrapper_408']} flex-row`}>
                <span className={`${styles['text_541']}`}>关机时-未使用预约功能</span>
                <span className={`${styles['text_542']}`}>关机时-已使用预约功能</span>
                <span className={`${styles['text_543']}`}>关机时-无预约功能</span>
                <span className={`${styles['text_544']}`}>关机时-未使用预约功能</span>
                <span className={`${styles['text_545']}`}>关机时-已使用预约功能</span>
              </div>
              <div className={`${styles['block_162']} flex-row justify-between`}>
                <div className={`${styles['block_80']} flex-row`}>
                  <div className={`${styles['image-text_214']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_64']}`}
                      src={
                        require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                      }
                    />
                    <span className={`${styles['text-group_80']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_215']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_65']}`}
                      src={
                        require('./assets/img/SketchPng24eaed3f790e9d379b6989a79038917b30df09b2ea1d8ee2df2c31c215750c82.png')
                      }
                    />
                    <span className={`${styles['text-group_81']}`}>预约</span>
                  </div>
                </div>
                <div className={`${styles['block_81']} flex-row justify-between`}>
                  <div className={`${styles['image-text_216']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_66']}`}
                      src={
                        require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                      }
                    />
                    <span className={`${styles['text-group_82']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_217']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_67']}`}
                      src={
                        require('./assets/img/SketchPngb909ed52425c11c758449df0186c19876a69fd9be03a50e578cb44a5bc7ab1b6.png')
                      }
                    />
                    <span className={`${styles['text-group_83']}`}>定时｜开</span>
                  </div>
                </div>
                <div className={`${styles['block_82']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_68']}`}
                    src={
                      require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                    }
                  />
                  <div className={`${styles['group_113']} flex-row`}>
                    <div className={`${styles['image-text_218']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_69']}`}
                        src={
                          require('./assets/img/SketchPng9dacfd37477c70f681093d0d17c8ca7d07a43a64b2658b27cf28d6688075ce5a.png')
                        }
                      />
                      <span className={`${styles['text-group_84']}`}>启动</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['block_83']} flex-row`}>
                  <img
                    className={`${styles['label_70']}`}
                    src={
                      require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                    }
                  />
                  <div className={`${styles['box_105']} flex-row`}>
                    <div className={`${styles['image-text_219']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_71']}`}
                        src={
                          require('./assets/img/SketchPng9dacfd37477c70f681093d0d17c8ca7d07a43a64b2658b27cf28d6688075ce5a.png')
                        }
                      />
                      <span className={`${styles['text-group_85']}`}>启动</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_72']}`}
                    src={
                      require('./assets/img/SketchPng24eaed3f790e9d379b6989a79038917b30df09b2ea1d8ee2df2c31c215750c82.png')
                    }
                  />
                </div>
                <div className={`${styles['block_84']} flex-row`}>
                  <img
                    className={`${styles['label_73']}`}
                    src={
                      require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                    }
                  />
                  <div className={`${styles['group_114']} flex-row`}>
                    <div className={`${styles['image-text_220']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_74']}`}
                        src={
                          require('./assets/img/SketchPng9dacfd37477c70f681093d0d17c8ca7d07a43a64b2658b27cf28d6688075ce5a.png')
                        }
                      />
                      <span className={`${styles['text-group_86']}`}>启动</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_75']}`}
                    src={
                      require('./assets/img/SketchPng474c977c7b75f463007a7a6059c83344579d74e16f38c3f99f29f83daf7718d2.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['text-wrapper_409']} flex-row`}>
                <span className={`${styles['text_546']}`}>开机时-未使用预约功能</span>
                <span className={`${styles['text_547']}`}>开机时-已使用预约功能</span>
                <span className={`${styles['text_548']}`}>开机时-无预约功能</span>
                <span className={`${styles['text_549']}`}>开机时-未使用预约功能</span>
                <span className={`${styles['text_550']}`}>开机时-已使用预约功能</span>
              </div>
              <div className={`${styles['block_163']} flex-row justify-between`}>
                <div className={`${styles['box_106']} flex-row`}>
                  <div className={`${styles['image-text_221']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_76']}`}
                      src={
                        require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                      }
                    />
                    <span className={`${styles['text-group_87']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_222']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_77']}`}
                      src={
                        require('./assets/img/SketchPng24eaed3f790e9d379b6989a79038917b30df09b2ea1d8ee2df2c31c215750c82.png')
                      }
                    />
                    <span className={`${styles['text-group_88']}`}>预约</span>
                  </div>
                </div>
                <div className={`${styles['box_107']} flex-row`}>
                  <div className={`${styles['image-text_223']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_78']}`}
                      src={
                        require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                      }
                    />
                    <span className={`${styles['text-group_89']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_224']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_79']}`}
                      src={
                        require('./assets/img/SketchPng0be1fd4985bd23e1ff1328f6a01a5880cfb14195da459db9d67dc836326ea1b6.png')
                      }
                    />
                    <span className={`${styles['text-group_90']}`}>定时｜关</span>
                  </div>
                </div>
                <div className={`${styles['box_108']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_80']}`}
                    src={
                      require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                    }
                  />
                  <div className={`${styles['section_51']} flex-row`}>
                    <div className={`${styles['image-text_225']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_81']}`}
                        src={
                          require('./assets/img/SketchPng3fb5e4cb5a542ff0681d2b329579401e5c40a1a8b2f77161e22529842ebe6648.png')
                        }
                      />
                      <span className={`${styles['text-group_91']}`}>暂停</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_109']} flex-row`}>
                  <img
                    className={`${styles['label_82']}`}
                    src={
                      require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                    }
                  />
                  <div className={`${styles['group_115']} flex-row`}>
                    <div className={`${styles['image-text_226']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_83']}`}
                        src={
                          require('./assets/img/SketchPng3fb5e4cb5a542ff0681d2b329579401e5c40a1a8b2f77161e22529842ebe6648.png')
                        }
                      />
                      <span className={`${styles['text-group_92']}`}>暂停</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_84']}`}
                    src={
                      require('./assets/img/SketchPng24eaed3f790e9d379b6989a79038917b30df09b2ea1d8ee2df2c31c215750c82.png')
                    }
                  />
                </div>
                <div className={`${styles['box_110']} flex-row`}>
                  <img
                    className={`${styles['label_85']}`}
                    src={
                      require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                    }
                  />
                  <div className={`${styles['box_111']} flex-row`}>
                    <div className={`${styles['image-text_227']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_86']}`}
                        src={
                          require('./assets/img/SketchPng3fb5e4cb5a542ff0681d2b329579401e5c40a1a8b2f77161e22529842ebe6648.png')
                        }
                      />
                      <span className={`${styles['text-group_93']}`}>暂停</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_87']}`}
                    src={
                      require('./assets/img/SketchPng0be1fd4985bd23e1ff1328f6a01a5880cfb14195da459db9d67dc836326ea1b6.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['text-wrapper_410']} flex-row`}>
                <span className={`${styles['text_551']}`}>禁用：在上述情况上叠加30%透明度</span>
              </div>
              <div className={`${styles['text-wrapper_411']} flex-row`}>
                <span className={`${styles['text_552']}`}>关机时-禁用-未使用预约功能</span>
                <span className={`${styles['text_553']}`}>关机时-禁用-已使用预约功能</span>
                <span className={`${styles['text_554']}`}>关机时-无预约功能</span>
                <span className={`${styles['text_555']}`}>关机时-未使用预约功能</span>
                <span className={`${styles['text_556']}`}>关机时-已使用预约功能</span>
              </div>
              <div className={`${styles['block_164']} flex-row justify-between`}>
                <div className={`${styles['box_112']} flex-row`}>
                  <div className={`${styles['image-text_228']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_88']}`}
                      src={
                        require('./assets/img/SketchPngbc32dab4e7bdf6a0fdef1e1a5e6ffa15c4fd210aa5d1fef73cd627fe71f3829c.png')
                      }
                    />
                    <span className={`${styles['text-group_94']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_229']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_89']}`}
                      src={
                        require('./assets/img/SketchPng723af93ce80219b0c1d14be0e4f0fee3f1b07f4f9ba4ce85c4aacb7304ef040b.png')
                      }
                    />
                    <span className={`${styles['text-group_95']}`}>预约</span>
                  </div>
                </div>
                <div className={`${styles['box_113']} flex-row justify-between`}>
                  <div className={`${styles['image-text_230']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_90']}`}
                      src={
                        require('./assets/img/SketchPngbc32dab4e7bdf6a0fdef1e1a5e6ffa15c4fd210aa5d1fef73cd627fe71f3829c.png')
                      }
                    />
                    <span className={`${styles['text-group_96']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_231']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_91']}`}
                      src={
                        require('./assets/img/SketchPng12b88c2cb65ec80b4a2f7dbd0655603ee37c2a8a9c5cb196df68dd4bf68b0d28.png')
                      }
                    />
                    <span className={`${styles['text-group_97']}`}>定时｜开</span>
                  </div>
                </div>
                <div className={`${styles['box_114']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_92']}`}
                    src={
                      require('./assets/img/SketchPngbc32dab4e7bdf6a0fdef1e1a5e6ffa15c4fd210aa5d1fef73cd627fe71f3829c.png')
                    }
                  />
                  <div className={`${styles['box_115']} flex-row`}>
                    <div className={`${styles['image-text_232']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_93']}`}
                        src={
                          require('./assets/img/SketchPng9dacfd37477c70f681093d0d17c8ca7d07a43a64b2658b27cf28d6688075ce5a.png')
                        }
                      />
                      <span className={`${styles['text-group_98']}`}>启动</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_116']} flex-row`}>
                  <img
                    className={`${styles['label_94']}`}
                    src={
                      require('./assets/img/SketchPngbc32dab4e7bdf6a0fdef1e1a5e6ffa15c4fd210aa5d1fef73cd627fe71f3829c.png')
                    }
                  />
                  <div className={`${styles['block_85']} flex-row`}>
                    <div className={`${styles['image-text_233']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_95']}`}
                        src={
                          require('./assets/img/SketchPng9dacfd37477c70f681093d0d17c8ca7d07a43a64b2658b27cf28d6688075ce5a.png')
                        }
                      />
                      <span className={`${styles['text-group_99']}`}>启动</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_96']}`}
                    src={
                      require('./assets/img/SketchPng723af93ce80219b0c1d14be0e4f0fee3f1b07f4f9ba4ce85c4aacb7304ef040b.png')
                    }
                  />
                </div>
                <div className={`${styles['box_117']} flex-row`}>
                  <img
                    className={`${styles['label_97']}`}
                    src={
                      require('./assets/img/SketchPngbc32dab4e7bdf6a0fdef1e1a5e6ffa15c4fd210aa5d1fef73cd627fe71f3829c.png')
                    }
                  />
                  <div className={`${styles['group_116']} flex-row`}>
                    <div className={`${styles['image-text_234']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_98']}`}
                        src={
                          require('./assets/img/SketchPng9dacfd37477c70f681093d0d17c8ca7d07a43a64b2658b27cf28d6688075ce5a.png')
                        }
                      />
                      <span className={`${styles['text-group_100']}`}>启动</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_99']}`}
                    src={
                      require('./assets/img/SketchPngf6fd7e38f115671602ae1f51984767462976be9e29756b7eedee5becb46b3e94.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['text-wrapper_412']} flex-row`}>
                <span className={`${styles['text_557']}`}>开机时-禁用-未使用预约功能</span>
                <span className={`${styles['text_558']}`}>开机时-禁用-已使用预约功能</span>
                <span className={`${styles['text_559']}`}>开机时-无预约功能</span>
                <span className={`${styles['text_560']}`}>开机时-未使用预约功能</span>
                <span className={`${styles['text_561']}`}>开机时-已使用预约功能</span>
              </div>
              <div className={`${styles['block_165']} flex-row justify-between`}>
                <div className={`${styles['block_86']} flex-row`}>
                  <div className={`${styles['image-text_235']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_100']}`}
                      src={
                        require('./assets/img/SketchPngebff21443e92f84d8ab23a533d9106f1480e878b8ef3399a210b05006553b421.png')
                      }
                    />
                    <span className={`${styles['text-group_101']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_236']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_101']}`}
                      src={
                        require('./assets/img/SketchPng723af93ce80219b0c1d14be0e4f0fee3f1b07f4f9ba4ce85c4aacb7304ef040b.png')
                      }
                    />
                    <span className={`${styles['text-group_102']}`}>预约</span>
                  </div>
                </div>
                <div className={`${styles['block_87']} flex-row`}>
                  <div className={`${styles['image-text_237']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_102']}`}
                      src={
                        require('./assets/img/SketchPngebff21443e92f84d8ab23a533d9106f1480e878b8ef3399a210b05006553b421.png')
                      }
                    />
                    <span className={`${styles['text-group_103']}`}>开关</span>
                  </div>
                  <div className={`${styles['image-text_238']} flex-col justify-between`}>
                    <img
                      className={`${styles['label_103']}`}
                      src={
                        require('./assets/img/SketchPng8d0afce243078bd6e984633d6090341c1c087067c6d7a35733a1e641e301aa5a.png')
                      }
                    />
                    <span className={`${styles['text-group_104']}`}>定时｜关</span>
                  </div>
                </div>
                <div className={`${styles['block_88']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_104']}`}
                    src={
                      require('./assets/img/SketchPngebff21443e92f84d8ab23a533d9106f1480e878b8ef3399a210b05006553b421.png')
                    }
                  />
                  <div className={`${styles['box_118']} flex-row`}>
                    <div className={`${styles['image-text_239']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_105']}`}
                        src={
                          require('./assets/img/SketchPng2138eba4ebfd9c74a78bab7e3760526d83bdab4acedf3750282a1345b1d511c0.png')
                        }
                      />
                      <span className={`${styles['text-group_105']}`}>暂停</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['block_89']} flex-row`}>
                  <img
                    className={`${styles['label_106']}`}
                    src={
                      require('./assets/img/SketchPngebff21443e92f84d8ab23a533d9106f1480e878b8ef3399a210b05006553b421.png')
                    }
                  />
                  <div className={`${styles['group_117']} flex-row`}>
                    <div className={`${styles['image-text_240']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_107']}`}
                        src={
                          require('./assets/img/SketchPng2138eba4ebfd9c74a78bab7e3760526d83bdab4acedf3750282a1345b1d511c0.png')
                        }
                      />
                      <span className={`${styles['text-group_106']}`}>暂停</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_108']}`}
                    src={
                      require('./assets/img/SketchPng723af93ce80219b0c1d14be0e4f0fee3f1b07f4f9ba4ce85c4aacb7304ef040b.png')
                    }
                  />
                </div>
                <div className={`${styles['block_90']} flex-row`}>
                  <img
                    className={`${styles['label_109']}`}
                    src={
                      require('./assets/img/SketchPngebff21443e92f84d8ab23a533d9106f1480e878b8ef3399a210b05006553b421.png')
                    }
                  />
                  <div className={`${styles['box_119']} flex-row`}>
                    <div className={`${styles['image-text_241']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_110']}`}
                        src={
                          require('./assets/img/SketchPng2138eba4ebfd9c74a78bab7e3760526d83bdab4acedf3750282a1345b1d511c0.png')
                        }
                      />
                      <span className={`${styles['text-group_107']}`}>暂停</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_111']}`}
                    src={
                      require('./assets/img/SketchPng8d0afce243078bd6e984633d6090341c1c087067c6d7a35733a1e641e301aa5a.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['block_166']} flex-row justify-between`}>
                <div className={`${styles['text-group_280']} flex-col justify-between`}>
                  <span className={`${styles['text_562']}`}>按钮加载过程描述</span>
                  <span className={`${styles['text_563']}`}>开机操作加载过程</span>
                </div>
                <span className={`${styles['text_564']}`}>关机操作加载过程</span>
              </div>
              <div className={`${styles['block_167']} flex-row`}>
                <img
                  className={`${styles['label_112']}`}
                  src={
                    require('./assets/img/SketchPng47a70b176a7421657eadf6369522ad941dddc7927cf9d5f3792976645ad482a3.png')
                  }
                />
                <img
                  className={`${styles['image_144']}`}
                  src={
                    require('./assets/img/SketchPng5407da95f48ec473b2023a3e803d8217085bd34a997706f0c1dde1e01a23b46c.png')
                  }
                />
                <img
                  className={`${styles['label_113']}`}
                  src={
                    require('./assets/img/SketchPng533b44d5645dd52a65543d8b4edbc02e178bb5da879594aacad0594047ef0686.png')
                  }
                />
                <img
                  className={`${styles['image_145']}`}
                  src={
                    require('./assets/img/SketchPng5407da95f48ec473b2023a3e803d8217085bd34a997706f0c1dde1e01a23b46c.png')
                  }
                />
                <img
                  className={`${styles['label_114']}`}
                  src={
                    require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                  }
                />
                <div className={`${styles['group_118']} flex-row`}>
                  <div className={`${styles['image-text_242']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_115']}`}
                      src={
                        require('./assets/img/SketchPngf631fe1e3f5fcb33d6b4223b3782c8c41e00e87bf28408873862ffb052e93af3.png')
                      }
                    />
                    <span className={`${styles['text-group_109']}`}>启动</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_146']}`}
                  src={
                    require('./assets/img/SketchPngd8806b348d20c02bfdb2b6a71196a3d2f4ce45e0a742672b70f6d0998d71e331.png')
                  }
                />
                <img
                  className={`${styles['image_147']}`}
                  src={
                    require('./assets/img/SketchPng602c6919550d90ab63a45fc60713a7d09aa271df32c58134036d64f6da7dcb98.png')
                  }
                />
                <img
                  className={`${styles['image_148']}`}
                  src={
                    require('./assets/img/SketchPngd8806b348d20c02bfdb2b6a71196a3d2f4ce45e0a742672b70f6d0998d71e331.png')
                  }
                />
                <div className={`${styles['group_119']} flex-row`}>
                  <div className={`${styles['image-text_243']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_116']}`}
                      src={
                        require('./assets/img/SketchPng3fb5e4cb5a542ff0681d2b329579401e5c40a1a8b2f77161e22529842ebe6648.png')
                      }
                    />
                    <span className={`${styles['text-group_110']}`}>暂停</span>
                  </div>
                </div>
                <img
                  className={`${styles['label_117']}`}
                  src={
                    require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                  }
                />
                <img
                  className={`${styles['image_149']}`}
                  src={
                    require('./assets/img/SketchPng5407da95f48ec473b2023a3e803d8217085bd34a997706f0c1dde1e01a23b46c.png')
                  }
                />
                <img
                  className={`${styles['label_118']}`}
                  src={
                    require('./assets/img/SketchPng04f8cad64085c2c34f146ade6908dd6ce3535cfec340ec60f62705b7dbc44a15.png')
                  }
                />
                <img
                  className={`${styles['image_150']}`}
                  src={
                    require('./assets/img/SketchPng5407da95f48ec473b2023a3e803d8217085bd34a997706f0c1dde1e01a23b46c.png')
                  }
                />
                <img
                  className={`${styles['label_119']}`}
                  src={
                    require('./assets/img/SketchPng47a70b176a7421657eadf6369522ad941dddc7927cf9d5f3792976645ad482a3.png')
                  }
                />
                <div className={`${styles['group_120']} flex-row`}>
                  <div className={`${styles['image-text_244']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_120']}`}
                      src={
                        require('./assets/img/SketchPng3fb5e4cb5a542ff0681d2b329579401e5c40a1a8b2f77161e22529842ebe6648.png')
                      }
                    />
                    <span className={`${styles['text-group_111']}`}>暂停</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_151']}`}
                  src={
                    require('./assets/img/SketchPngd8806b348d20c02bfdb2b6a71196a3d2f4ce45e0a742672b70f6d0998d71e331.png')
                  }
                />
                <img
                  className={`${styles['image_152']}`}
                  src={
                    require('./assets/img/SketchPng602c6919550d90ab63a45fc60713a7d09aa271df32c58134036d64f6da7dcb98.png')
                  }
                />
                <img
                  className={`${styles['image_153']}`}
                  src={
                    require('./assets/img/SketchPngd8806b348d20c02bfdb2b6a71196a3d2f4ce45e0a742672b70f6d0998d71e331.png')
                  }
                />
                <div className={`${styles['group_121']} flex-row`}>
                  <div className={`${styles['image-text_245']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_121']}`}
                      src={
                        require('./assets/img/SketchPngf631fe1e3f5fcb33d6b4223b3782c8c41e00e87bf28408873862ffb052e93af3.png')
                      }
                    />
                    <span className={`${styles['text-group_112']}`}>启动</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['box_298']} flex-col`}>
              <span className={`${styles['text_565']}`}>Toast</span>
              <div className={`${styles['text-wrapper_168']} flex-col`}>
                <span className={`${styles['text_566']}`}>最短长度</span>
              </div>
              <div className={`${styles['text-wrapper_169']} flex-col`}>
                <span className={`${styles['text_567']}`}>自适应长度，请稍后尝试刷新</span>
              </div>
              <div className={`${styles['text-wrapper_170']} flex-col`}>
                <span className={`${styles['text_568']}`}>最长长度，请稍后尝试刷新占位符的文案</span>
              </div>
              <div className={`${styles['text-wrapper_171']} flex-col`}>
                <span className={`${styles['text_569']}`}>设备未响应，请稍后尝试刷新，超出就换行了这是文案</span>
              </div>
              <div className={`${styles['text-wrapper_172']} flex-col`}>
                <span className={`${styles['text_570']}`}>最短长度</span>
              </div>
              <div className={`${styles['text-wrapper_173']} flex-col`}>
                <span className={`${styles['text_571']}`}>自适应长度，请稍后尝试刷新</span>
              </div>
              <div className={`${styles['text-wrapper_174']} flex-col`}>
                <span className={`${styles['text_572']}`}>最长长度，请稍后尝试刷新占位符的文案</span>
              </div>
              <div className={`${styles['text-wrapper_175']} flex-col`}>
                <span className={`${styles['text_573']}`}>设备未响应，请稍后尝试刷新，超出就换行了这是文案</span>
              </div>
            </div>
            <div className={`${styles['box_121']} flex-col`}>
              <div className={`${styles['text-wrapper_176']} flex-col`}>
                <span className={`${styles['text_574']}`}>设备添加成功</span>
              </div>
            </div>
          </div>
          <span className={`${styles['text_575']}`}>功能操作区</span>
          <div className={`${styles['box_122']} flex-col`}>
            <div className={`${styles['text-wrapper_413']} flex-row`}>
              <span className={`${styles['text_576']}`}>卡片-list</span>
              <span className={`${styles['text_577']}`}>卡片-滑杆</span>
              <span className={`${styles['text_578']}`}>卡片-按钮</span>
              <span className={`${styles['text_579']}`}>卡片-可展开收起</span>
              <span className={`${styles['text_580']}`}>卡片-小卡片</span>
              <span className={`${styles['text_581']}`}>卡片-数据卡片</span>
              <span className={`${styles['text_582']}`}>卡片-数据卡片（展示）</span>
              <span className={`${styles['text_583']}`}>耗材相关</span>
              <span className={`${styles['text_584']}`}>场景入口</span>
            </div>
            <div className={`${styles['section_127']} flex-row`}>
              <div className={`${styles['group_313']} flex-col`}>
                <div className={`${styles['block_168']} flex-row justify-between`}>
                  <span className={`${styles['text_1108']}`}>列表标题</span>
                  <img
                    className={`${styles['thumbnail_132']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['block_169']} flex-row justify-between`}>
                  <div className={`${styles['image-text_246']} flex-row justify-between`}>
                    <div className={`${styles['box_299']} flex-col`} />
                    <span className={`${styles['text-group_281']}`}>列表标题</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_133']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['block_170']} flex-row justify-between`}>
                  <div className={`${styles['section_128']} flex-col`} />
                  <div className={`${styles['image-text_247']} flex-row justify-between`}>
                    <span className={`${styles['text-group_282']}`}>列表标题</span>
                    <img
                      className={`${styles['image_223']}`}
                      src={
                        require('./assets/img/SketchPng47985a22545e19fd2755bdc603fc65c9e539371645bb161a421abff8dd2a93a0.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_171']} flex-row justify-between`}>
                  <div className={`${styles['section_129']} flex-col`} />
                  <div className={`${styles['image-text_248']} flex-row justify-between`}>
                    <span className={`${styles['text-group_283']}`}>列表标题</span>
                    <img
                      className={`${styles['image_224']}`}
                      src={
                        require('./assets/img/SketchPng5b5d952c952fe4660def78dd8a64b5cde244bfc8d722e747057ae2662bb5b06b.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_172']} flex-row`}>
                  <div className={`${styles['image-text_249']} flex-row justify-between`}>
                    <span className={`${styles['text-group_284']}`}>参数</span>
                    <img
                      className={`${styles['thumbnail_134']}`}
                      src={
                        require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-text_250']} flex-row justify-between`}>
                    <div className={`${styles['box_300']} flex-col`} />
                    <span className={`${styles['text-group_285']}`}>列表标题</span>
                  </div>
                </div>
                <div className={`${styles['block_173']} flex-row justify-between`}>
                  <div className={`${styles['image-text_251']} flex-row justify-between`}>
                    <div className={`${styles['group_314']} flex-col`} />
                    <span className={`${styles['text-group_286']}`}>列表标题</span>
                  </div>
                  <span className={`${styles['text_1109']}`}>参数</span>
                </div>
                <div className={`${styles['block_174']} flex-row`}>
                  <div className={`${styles['group_315']} flex-col`} />
                  <span className={`${styles['text_1110']}`}>列表标题</span>
                  <div className={`${styles['text-wrapper_414']} flex-col`}>
                    <span className={`${styles['text_1111']}`}>按钮</span>
                  </div>
                </div>
                <div className={`${styles['block_175']} flex-row`}>
                  <div className={`${styles['section_130']} flex-col`} />
                  <span className={`${styles['text_1112']}`}>列表标题</span>
                  <div className={`${styles['text-wrapper_415']} flex-col`}>
                    <span className={`${styles['text_1113']}`}>按钮</span>
                  </div>
                </div>
                <div className={`${styles['group_134']} flex-row`}>
                  <div className={`${styles['image-text_252']} flex-row justify-between`}>
                    <div className={`${styles['block_176']} flex-col align-center`}>
                      <div className={`${styles['group_135']} flex-col`} />
                    </div>
                    <span className={`${styles['text-group_119']}`}>列表标题示例列表标题列表标题列表标题列表标题列…</span>
                  </div>
                  <img
                    className={`${styles['label_122']}`}
                    src={
                      require('./assets/img/SketchPng075a5ffce4eb663176ce20f8ba03cb91b8f2b1d0ef9943badecc405925a76a53.png')
                    }
                  />
                </div>
                <div className={`${styles['group_136']} flex-row`}>
                  <div className={`${styles['image-text_253']} flex-row justify-between`}>
                    <div className={`${styles['box_125']} flex-col`} />
                    <div className={`${styles['text-group_287']} flex-col justify-between`}>
                      <span className={`${styles['text_591']}`}>禁用状态卡片上元素均30%</span>
                      <span className={`${styles['text_592']}`}>副标题辅助文案说明</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_135']}`}
                    src={
                      require('./assets/img/SketchPngd08eb4c6a547b5e0b2168ddd4d16c228b566d0d66050a334509e023049dd51e1.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['group_316']} flex-col justify-between`}>
                <div className={`${styles['group_317']} flex-row justify-between`}>
                  <div className={`${styles['text-group_288']} flex-col justify-between`}>
                    <span className={`${styles['text_1114']}`}>列表标题</span>
                    <span className={`${styles['text_1115']}`}>副标题辅助文案说明</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_136']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['group_318']} flex-row`}>
                  <div className={`${styles['image-text_254']} flex-row justify-between`}>
                    <div className={`${styles['group_319']} flex-col`} />
                    <div className={`${styles['text-group_289']} flex-col justify-between`}>
                      <span className={`${styles['text_1116']}`}>列表标题</span>
                      <span className={`${styles['text_1117']}`}>副标题辅助文案说明</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_320']} flex-row justify-between`}>
                  <div className={`${styles['box_301']} flex-col`} />
                  <div className={`${styles['image-text_255']} flex-row justify-between`}>
                    <div className={`${styles['text-group_290']} flex-col justify-between`}>
                      <span className={`${styles['text_1118']}`}>列表标题</span>
                      <span className={`${styles['text_1119']}`}>副标题辅助文案说明</span>
                    </div>
                    <img
                      className={`${styles['image_225']}`}
                      src={
                        require('./assets/img/SketchPng47985a22545e19fd2755bdc603fc65c9e539371645bb161a421abff8dd2a93a0.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_321']} flex-row justify-between`}>
                  <div className={`${styles['box_302']} flex-col`} />
                  <div className={`${styles['image-text_256']} flex-row justify-between`}>
                    <div className={`${styles['text-group_291']} flex-col justify-between`}>
                      <span className={`${styles['text_1120']}`}>列表标题</span>
                      <span className={`${styles['text_1121']}`}>副标题辅助文案说明</span>
                    </div>
                    <img
                      className={`${styles['image_226']}`}
                      src={
                        require('./assets/img/SketchPng5b5d952c952fe4660def78dd8a64b5cde244bfc8d722e747057ae2662bb5b06b.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_322']} flex-row`}>
                  <div className={`${styles['image-text_257']} flex-row justify-between`}>
                    <span className={`${styles['text-group_292']}`}>参数</span>
                    <img
                      className={`${styles['thumbnail_137']}`}
                      src={
                        require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-text_258']} flex-row justify-between`}>
                    <div className={`${styles['box_303']} flex-col`} />
                    <div className={`${styles['text-group_293']} flex-col justify-between`}>
                      <span className={`${styles['text_1122']}`}>列表标题</span>
                      <span className={`${styles['text_1123']}`}>副标题辅助文案说明</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_323']} flex-row justify-between`}>
                  <div className={`${styles['image-text_259']} flex-row justify-between`}>
                    <div className={`${styles['box_304']} flex-col`} />
                    <div className={`${styles['text-group_294']} flex-col justify-between`}>
                      <span className={`${styles['text_1124']}`}>列表标题</span>
                      <span className={`${styles['text_1125']}`}>副标题辅助文案说明</span>
                    </div>
                  </div>
                  <span className={`${styles['text_1126']}`}>参数</span>
                </div>
                <div className={`${styles['group_324']} flex-row justify-between`}>
                  <div className={`${styles['block_177']} flex-col`} />
                  <div className={`${styles['block_178']} flex-col justify-between`}>
                    <span className={`${styles['text_1127']}`}>列表标题</span>
                    <span className={`${styles['text_1128']}`}>副标题辅助文案说明</span>
                    <div className={`${styles['text-wrapper_416']} flex-col`}>
                      <span className={`${styles['text_1129']}`}>按钮</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_325']} flex-row justify-between`}>
                  <div className={`${styles['section_131']} flex-col`} />
                  <div className={`${styles['section_132']} flex-col justify-between`}>
                    <span className={`${styles['text_1130']}`}>列表标题</span>
                    <span className={`${styles['text_1131']}`}>副标题辅助文案说明</span>
                    <div className={`${styles['text-wrapper_417']} flex-col`}>
                      <span className={`${styles['text_1132']}`}>按钮</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_326']} flex-row justify-between`}>
                  <div className={`${styles['image-text_260']} flex-row justify-between`}>
                    <div className={`${styles['box_305']} flex-col`} />
                    <div className={`${styles['text-group_295']} flex-col justify-between`}>
                      <span className={`${styles['text_1133']}`}>列表标题示例</span>
                      <span className={`${styles['text_1134']}`}>副标题辅助文案说明副标题辅助文案说明副标题辅助文案说明</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_138']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['group_151']} flex-row justify-between`}>
                  <div className={`${styles['image-text_261']} flex-row justify-between`}>
                    <div className={`${styles['box_127']} flex-col`} />
                    <div className={`${styles['text-group_296']} flex-col justify-between`}>
                      <span className={`${styles['text_614']}`}>按住瞬间卡片背景为#F2F2F2</span>
                      <span className={`${styles['text_615']}`}>副标题辅助文案说明</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_123']}`}
                    src={
                      require('./assets/img/SketchPng075a5ffce4eb663176ce20f8ba03cb91b8f2b1d0ef9943badecc405925a76a53.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['group_327']} flex-col justify-between`}>
                <div className={`${styles['section_133']} flex-col`}>
                  <div className={`${styles['group_328']} flex-row justify-between`}>
                    <span className={`${styles['text_1135']}`}>温度</span>
                    <img
                      className={`${styles['thumbnail_139']}`}
                      src={
                        require('./assets/img/SketchPng9a78e6734b105ea0f3cec4c76e68f008b460b78ce101178a6db0b747b4941e42.png')
                      }
                    />
                    <span className={`${styles['text_1136']}`}>10℃</span>
                  </div>
                  <div className={`${styles['image-text_262']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_227']}`}
                      src={
                        require('./assets/img/SketchPng6b06ba5d146ec13a968be572091bdc2c3c1407453d332a7a2a6cc302f3531787.png')
                      }
                    />
                    <div className={`${styles['text-group_297']} flex-row justify-between`}>
                      <span className={`${styles['text_1137']}`}>10℃</span>
                      <span className={`${styles['text_1138']}`}>35℃</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_134']} flex-col`}>
                  <div className={`${styles['group_329']} flex-col`}>
                    <div className={`${styles['box_306']} flex-row justify-between`}>
                      <span className={`${styles['text_1139']}`}>温度</span>
                      <img
                        className={`${styles['thumbnail_140']}`}
                        src={
                          require('./assets/img/SketchPng9a78e6734b105ea0f3cec4c76e68f008b460b78ce101178a6db0b747b4941e42.png')
                        }
                      />
                      <span className={`${styles['text_1140']}`}>27℃</span>
                    </div>
                    <div className={`${styles['image-text_263']} flex-col justify-between`}>
                      <img
                        className={`${styles['image_228']}`}
                        src={
                          require('./assets/img/SketchPng10ec79faa625d42e3f32c7428bcdcc5f0b714044bb72fb2b145b86c01ea3bf08.png')
                        }
                      />
                      <div className={`${styles['text-group_298']} flex-row justify-between`}>
                        <span className={`${styles['text_1141']}`}>10℃</span>
                        <span className={`${styles['text_1142']}`}>35℃</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_158']} flex-col`}>
                  <div className={`${styles['block_95']} flex-col`}>
                    <div className={`${styles['block_179']} flex-row justify-between`}>
                      <span className={`${styles['text_624']}`}>温度</span>
                      <img
                        className={`${styles['thumbnail_80']}`}
                        src={
                          require('./assets/img/SketchPng9a78e6734b105ea0f3cec4c76e68f008b460b78ce101178a6db0b747b4941e42.png')
                        }
                      />
                      <span className={`${styles['text_625']}`}>27°F</span>
                    </div>
                    <div className={`${styles['image-text_264']} flex-col justify-between`}>
                      <img
                        className={`${styles['image_160']}`}
                        src={
                          require('./assets/img/SketchPng10ec79faa625d42e3f32c7428bcdcc5f0b714044bb72fb2b145b86c01ea3bf08.png')
                        }
                      />
                      <div className={`${styles['text-group_299']} flex-row`}>
                        <span className={`${styles['text_626']}`}>10℃</span>
                        <span className={`${styles['text_627']}`}>15℃</span>
                        <span className={`${styles['text_628']}`}>20℃</span>
                        <span className={`${styles['text_629']}`}>25℃</span>
                        <span className={`${styles['text_630']}`}>30℃</span>
                        <span className={`${styles['text_631']}`}>35℃</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_135']} flex-col`}>
                  <div className={`${styles['group_330']} flex-col`}>
                    <div className={`${styles['section_136']} flex-row justify-between`}>
                      <span className={`${styles['text_1143']}`}>温度</span>
                      <img
                        className={`${styles['thumbnail_141']}`}
                        src={
                          require('./assets/img/SketchPng9a78e6734b105ea0f3cec4c76e68f008b460b78ce101178a6db0b747b4941e42.png')
                        }
                      />
                      <span className={`${styles['text_1144']}`}>27℃</span>
                    </div>
                    <div className={`${styles['section_137']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_194']}`}
                        src={
                          require('./assets/img/SketchPng68ee90fc6ed1294e008b79fa85c2e2ce75fec37c84d57d65ad7bc9670aeb156a.png')
                        }
                      />
                      <div className={`${styles['image-text_265']} flex-col justify-between`}>
                        <img
                          className={`${styles['image_229']}`}
                          src={
                            require('./assets/img/SketchPng85d43e304f15158dc3b0193bf8a4bfedccc4ec121dafbc13ebcebdb7ad090dc3.png')
                          }
                        />
                        <div className={`${styles['text-group_300']} flex-row justify-between`}>
                          <span className={`${styles['text_1145']}`}>10℃</span>
                          <span className={`${styles['text_1146']}`}>15℃</span>
                          <span className={`${styles['text_1147']}`}>20℃</span>
                          <span className={`${styles['text_1148']}`}>25℃</span>
                          <span className={`${styles['text_1149']}`}>35℃</span>
                        </div>
                      </div>
                      <img
                        className={`${styles['label_195']}`}
                        src={
                          require('./assets/img/SketchPngf8e5d7769baffcf1d7d1f7d4994beec4719d47c8bc7f50584270d73f82a13338.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_138']} flex-col`}>
                  <div className={`${styles['box_307']} flex-col`}>
                    <div className={`${styles['group_331']} flex-row justify-between`}>
                      <span className={`${styles['text_1150']}`}>温度</span>
                      <img
                        className={`${styles['thumbnail_142']}`}
                        src={
                          require('./assets/img/SketchPng9a78e6734b105ea0f3cec4c76e68f008b460b78ce101178a6db0b747b4941e42.png')
                        }
                      />
                      <span className={`${styles['text_1151']}`}>12℃-18℃</span>
                    </div>
                    <div className={`${styles['image-text_266']} flex-col justify-between`}>
                      <img
                        className={`${styles['image_230']}`}
                        src={
                          require('./assets/img/SketchPng9bbc4997a761ddaad87af6e9fb41b14b9868a315214023448392b6a822a6e481.png')
                        }
                      />
                      <div className={`${styles['text-group_301']} flex-row justify-between`}>
                        <span className={`${styles['text_1152']}`}>10℃</span>
                        <span className={`${styles['text_1153']}`}>12℃</span>
                        <span className={`${styles['text_1154']}`}>14℃</span>
                        <span className={`${styles['text_1155']}`}>16℃</span>
                        <span className={`${styles['text_1156']}`}>18℃</span>
                        <span className={`${styles['text_1157']}`}>20℃</span>
                        <span className={`${styles['text_1158']}`}>22℃</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_139']} flex-col`}>
                  <div className={`${styles['section_140']} flex-col`}>
                    <div className={`${styles['section_141']} flex-row justify-between`}>
                      <span className={`${styles['text_1159']}`}>档位</span>
                      <img
                        className={`${styles['thumbnail_143']}`}
                        src={
                          require('./assets/img/SketchPngdf49010e9945cbef2e901642bdbca058e2c30299208366d2234f180f766fb209.png')
                        }
                      />
                      <span className={`${styles['text_1160']}`}>1&nbsp;档</span>
                    </div>
                    <div className={`${styles['image-text_267']} flex-col justify-between`}>
                      <img
                        className={`${styles['image_231']}`}
                        src={
                          require('./assets/img/SketchPng1732373d7143739b7bc01bd5d85c89077cc7f61727b027b17f80c4ad86a12298.png')
                        }
                      />
                      <div className={`${styles['text-group_302']} flex-row justify-between`}>
                        <span className={`${styles['text_1161']}`}>1</span>
                        <span className={`${styles['text_1162']}`}>2</span>
                        <span className={`${styles['text_1163']}`}>3</span>
                        <span className={`${styles['text_1164']}`}>4</span>
                        <span className={`${styles['text_1165']}`}>5</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_332']} flex-col`}>
                <div className={`${styles['box_308']} flex-col`}>
                  <div className={`${styles['box_309']} flex-row justify-between`}>
                    <span className={`${styles['text_1166']}`}>档位</span>
                    <img
                      className={`${styles['thumbnail_144']}`}
                      src={
                        require('./assets/img/SketchPng1dd4f575829b1b511c9a26df2140355792c1f2c2983d8bb29f67a230ac5c9760.png')
                      }
                    />
                    <span className={`${styles['text_1167']}`}>低</span>
                  </div>
                  <div className={`${styles['box_310']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_418']} flex-col`}>
                      <span className={`${styles['text_1168']}`}>低</span>
                    </div>
                    <div className={`${styles['text-wrapper_419']} flex-col`}>
                      <span className={`${styles['text_1169']}`}>中</span>
                    </div>
                    <div className={`${styles['text-wrapper_420']} flex-col`}>
                      <span className={`${styles['text_1170']}`}>高</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_311']} flex-col`}>
                  <div className={`${styles['box_312']} flex-row justify-between`}>
                    <span className={`${styles['text_1171']}`}>档位</span>
                    <img
                      className={`${styles['thumbnail_145']}`}
                      src={
                        require('./assets/img/SketchPng1dd4f575829b1b511c9a26df2140355792c1f2c2983d8bb29f67a230ac5c9760.png')
                      }
                    />
                    <span className={`${styles['text_1172']}`}>30°</span>
                  </div>
                  <div className={`${styles['box_313']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_421']} flex-col`}>
                      <span className={`${styles['text_1173']}`}>30°</span>
                    </div>
                    <div className={`${styles['text-wrapper_422']} flex-col`}>
                      <span className={`${styles['text_1174']}`}>60°</span>
                    </div>
                    <div className={`${styles['text-wrapper_423']} flex-col`}>
                      <span className={`${styles['text_1175']}`}>90°</span>
                    </div>
                    <div className={`${styles['text-wrapper_424']} flex-col`}>
                      <span className={`${styles['text_1176']}`}>120°</span>
                    </div>
                  </div>
                </div>
                <span className={`${styles['text_666']}`}>卡片-图标</span>
                <div className={`${styles['box_314']} flex-row`}>
                  <div className={`${styles['image-text_268']} flex-col justify-between`}>
                    <div className={`${styles['box_315']} flex-col`}>
                      <div className={`${styles['group_333']} flex-col`} />
                    </div>
                    <span className={`${styles['text-group_303']}`}>功能</span>
                  </div>
                  <div className={`${styles['image-text_269']} flex-col justify-between`}>
                    <div className={`${styles['section_142']} flex-col`}>
                      <div className={`${styles['box_316']} flex-col`} />
                    </div>
                    <span className={`${styles['text-group_304']}`}>功能</span>
                  </div>
                  <div className={`${styles['image-text_270']} flex-col justify-between`}>
                    <div className={`${styles['box_317']} flex-col`}>
                      <div className={`${styles['section_143']} flex-col`} />
                    </div>
                    <span className={`${styles['text-group_305']}`}>功能</span>
                  </div>
                  <div className={`${styles['image-text_271']} flex-col justify-between`}>
                    <div className={`${styles['section_144']} flex-col`}>
                      <div className={`${styles['group_334']} flex-col`} />
                    </div>
                    <span className={`${styles['text-group_306']}`}>功能</span>
                  </div>
                </div>
                <div className={`${styles['box_318']} flex-col`}>
                  <div className={`${styles['section_145']} flex-row justify-between`}>
                    <div className={`${styles['image-text_272']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_196']}`}
                        src={
                          require('./assets/img/SketchPnga1780943a625287b82bbd7fa833c7f1a0dc2dc76077da7beaa9a65fba69469ac.png')
                        }
                      />
                      <span className={`${styles['text-group_307']}`}>功能</span>
                    </div>
                    <div className={`${styles['image-text_273']} flex-col justify-between`}>
                      <div className={`${styles['section_146']} flex-col`}>
                        <div className={`${styles['box_319']} flex-col`} />
                      </div>
                      <span className={`${styles['text-group_308']}`}>功能</span>
                    </div>
                    <div className={`${styles['image-text_274']} flex-col justify-between`}>
                      <div className={`${styles['box_320']} flex-col`}>
                        <div className={`${styles['box_321']} flex-col`} />
                      </div>
                      <span className={`${styles['text-group_309']}`}>功能</span>
                    </div>
                    <div className={`${styles['image-text_275']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_197']}`}
                        src={
                          require('./assets/img/SketchPng54795797cf00f467b76a05e6389418eb234de0c71eeca164e05cd67cb4d8f407.png')
                        }
                      />
                      <span className={`${styles['text-group_310']}`}>功能</span>
                    </div>
                  </div>
                  <div className={`${styles['section_147']} flex-row justify-between`}>
                    <div className={`${styles['image-text_276']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_198']}`}
                        src={
                          require('./assets/img/SketchPnga1780943a625287b82bbd7fa833c7f1a0dc2dc76077da7beaa9a65fba69469ac.png')
                        }
                      />
                      <span className={`${styles['text-group_311']}`}>功能</span>
                    </div>
                    <div className={`${styles['image-text_277']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_199']}`}
                        src={
                          require('./assets/img/SketchPng54795797cf00f467b76a05e6389418eb234de0c71eeca164e05cd67cb4d8f407.png')
                        }
                      />
                      <span className={`${styles['text-group_312']}`}>功能</span>
                    </div>
                    <div className={`${styles['image-text_278']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_200']}`}
                        src={
                          require('./assets/img/SketchPng54795797cf00f467b76a05e6389418eb234de0c71eeca164e05cd67cb4d8f407.png')
                        }
                      />
                      <span className={`${styles['text-group_313']}`}>功能</span>
                    </div>
                    <div className={`${styles['image-text_279']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_201']}`}
                        src={
                          require('./assets/img/SketchPnga1780943a625287b82bbd7fa833c7f1a0dc2dc76077da7beaa9a65fba69469ac.png')
                        }
                      />
                      <span className={`${styles['text-group_314']}`}>功能</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_335']} flex-col`}>
                <div className={`${styles['box_322']} flex-row justify-between`}>
                  <div className={`${styles['image-text_280']} flex-row justify-between`}>
                    <div className={`${styles['group_336']} flex-col`} />
                    <span className={`${styles['text-group_315']}`}>列表标题</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_146']}`}
                    src={
                      require('./assets/img/SketchPng296a6f5c1297c0f6656dd896132475e7ada279077a0c4e27f611708560c0c9fb.png')
                    }
                  />
                </div>
                <div className={`${styles['box_141']} flex-row justify-between`}>
                  <div className={`${styles['image-text_281']} flex-row justify-between`}>
                    <div className={`${styles['group_174']} flex-col`} />
                    <span className={`${styles['text-group_149']}`}>设置温度</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_147']}`}
                    src={
                      require('./assets/img/SketchPng0183ab17603b0c9dc87477f9e4d3bb728e3e3f3f6cb9d94d5091fa3e29c634d3.png')
                    }
                  />
                </div>
                <div className={`${styles['box_142']} flex-col`}>
                  <img
                    className={`${styles['image_164']}`}
                    src={
                      require('./assets/img/SketchPng1bb3f3cae766d838be490415f52767e2ae61124eb29c213a3b72264620ec78c2.png')
                    }
                  />
                  <div className={`${styles['block_180']} flex-row justify-between`}>
                    <span className={`${styles['text_667']}`}>温度类型一</span>
                    <img
                      className={`${styles['thumbnail_88']}`}
                      src={
                        require('./assets/img/SketchPng0e83ca97cc2177848065b57a02e97e0d35ef99501fcc0507b725b26447070826.png')
                      }
                    />
                    <span className={`${styles['text_668']}`}>27℃</span>
                  </div>
                  <div className={`${styles['image-text_282']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_165']}`}
                      src={
                        require('./assets/img/SketchPngf0a5cef968b3202a424c3ea982950425b8d87727fd4180e5685b6e39df242fa3.png')
                      }
                    />
                    <div className={`${styles['text-group_316']} flex-row justify-between`}>
                      <span className={`${styles['text_669']}`}>10℃</span>
                      <span className={`${styles['text_670']}`}>35℃</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['image_166']}`}
                    src={
                      require('./assets/img/SketchPng6b229af45a6faa3668e5b939ea50433e7c46a88c77ada99f402b9aefa45080b9.png')
                    }
                  />
                </div>
                <div className={`${styles['box_143']} flex-col`}>
                  <div className={`${styles['block_181']} flex-row justify-between`}>
                    <span className={`${styles['text_671']}`}>温度类型二</span>
                    <img
                      className={`${styles['thumbnail_89']}`}
                      src={
                        require('./assets/img/SketchPng0e83ca97cc2177848065b57a02e97e0d35ef99501fcc0507b725b26447070826.png')
                      }
                    />
                    <span className={`${styles['text_672']}`}>27℃</span>
                  </div>
                  <div className={`${styles['image-text_283']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_167']}`}
                      src={
                        require('./assets/img/SketchPngf0a5cef968b3202a424c3ea982950425b8d87727fd4180e5685b6e39df242fa3.png')
                      }
                    />
                    <div className={`${styles['text-group_317']} flex-row justify-between`}>
                      <span className={`${styles['text_673']}`}>10℃</span>
                      <span className={`${styles['text_674']}`}>35℃</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_144']} flex-row`}>
                  <span className={`${styles['text_675']}`}>摇头</span>
                  <img
                    className={`${styles['image_232']}`}
                    src={
                      require('./assets/img/SketchPng95ca803037652cef01884fb9ca84fe772a9538d06f95c81ae93cfe661cb0786f.png')
                    }
                  />
                </div>
                <div className={`${styles['box_145']} flex-col`}>
                  <div className={`${styles['section_148']} flex-row`}>
                    <span className={`${styles['text_676']}`}>摇头</span>
                    <img
                      className={`${styles['thumbnail_90']}`}
                      src={
                        require('./assets/img/SketchPng0e83ca97cc2177848065b57a02e97e0d35ef99501fcc0507b725b26447070826.png')
                      }
                    />
                    <span className={`${styles['text_677']}`}>30°</span>
                    <img
                      className={`${styles['image_233']}`}
                      src={
                        require('./assets/img/SketchPng1d453bda7b4384172bf043ea056997ded02b2f1d9bd91151d0c9b1f46dc24ed1.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_149']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_189']} flex-col`}>
                      <span className={`${styles['text_678']}`}>30°</span>
                    </div>
                    <div className={`${styles['text-wrapper_190']} flex-col`}>
                      <span className={`${styles['text_679']}`}>60°</span>
                    </div>
                    <div className={`${styles['text-wrapper_191']} flex-col`}>
                      <span className={`${styles['text_680']}`}>90°</span>
                    </div>
                    <div className={`${styles['text-wrapper_192']} flex-col`}>
                      <span className={`${styles['text_681']}`}>120°</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_146']} flex-row`}>
                  <span className={`${styles['text_682']}`}>档位</span>
                  <img
                    className={`${styles['image_234']}`}
                    src={
                      require('./assets/img/SketchPng95ca803037652cef01884fb9ca84fe772a9538d06f95c81ae93cfe661cb0786f.png')
                    }
                  />
                </div>
                <div className={`${styles['box_147']} flex-col`}>
                  <div className={`${styles['box_323']} flex-row`}>
                    <span className={`${styles['text_683']}`}>档位</span>
                    <img
                      className={`${styles['thumbnail_91']}`}
                      src={
                        require('./assets/img/SketchPng0e83ca97cc2177848065b57a02e97e0d35ef99501fcc0507b725b26447070826.png')
                      }
                    />
                    <span className={`${styles['text_684']}`}>中</span>
                    <img
                      className={`${styles['image_235']}`}
                      src={
                        require('./assets/img/SketchPng1d453bda7b4384172bf043ea056997ded02b2f1d9bd91151d0c9b1f46dc24ed1.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-text_284']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_172']}`}
                      src={
                        require('./assets/img/SketchPng28df4fa22b2e2ce629049aec975c8f839dd428f60c6542ebc2eb901931029098.png')
                      }
                    />
                    <div className={`${styles['text-group_318']} flex-row justify-between`}>
                      <span className={`${styles['text_685']}`}>关</span>
                      <span className={`${styles['text_686']}`}>低</span>
                      <span className={`${styles['text_687']}`}>中</span>
                      <span className={`${styles['text_688']}`}>高</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_337']} flex-col`}>
                <div className={`${styles['box_324']} flex-row justify-between`}>
                  <div className={`${styles['section_65']} flex-row`}>
                    <span className={`${styles['text_689']}`}>功能菜单</span>
                    <div className={`${styles['block_104']} flex-col`} />
                  </div>
                  <div className={`${styles['section_66']} flex-row`}>
                    <span className={`${styles['text_690']}`}>功能菜单</span>
                    <div className={`${styles['group_179']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['box_325']} flex-row justify-between`}>
                  <div className={`${styles['block_105']} flex-row`}>
                    <span className={`${styles['text_691']}`}>功能菜单</span>
                    <div className={`${styles['box_148']} flex-col`} />
                  </div>
                  <div className={`${styles['block_106']} flex-row`}>
                    <span className={`${styles['text_692']}`}>功能菜单</span>
                    <div className={`${styles['block_107']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['box_326']} flex-row`}>
                  <div className={`${styles['block_108']} flex-row`}>
                    <div className={`${styles['image-text_285']} flex-col justify-between`}>
                      <div className={`${styles['box_149']} flex-col`} />
                      <span className={`${styles['text-group_153']}`}>功能菜单</span>
                    </div>
                  </div>
                  <div className={`${styles['block_109']} flex-row`}>
                    <div className={`${styles['image-text_286']} flex-col justify-between`}>
                      <div className={`${styles['group_182']} flex-col`} />
                      <span className={`${styles['text-group_154']}`}>功能菜单</span>
                    </div>
                  </div>
                  <div className={`${styles['block_110']} flex-row`}>
                    <div className={`${styles['image-text_287']} flex-col justify-between`}>
                      <div className={`${styles['group_183']} flex-col`} />
                      <span className={`${styles['text-group_155']}`}>功能菜单</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_327']} flex-row`}>
                  <div className={`${styles['group_185']} flex-row`}>
                    <div className={`${styles['image-text_288']} flex-col justify-between`}>
                      <div className={`${styles['block_111']} flex-col`} />
                      <span className={`${styles['text-group_156']}`}>功能菜单</span>
                    </div>
                  </div>
                  <div className={`${styles['group_186']} flex-row`}>
                    <div className={`${styles['image-text_289']} flex-col justify-between`}>
                      <div className={`${styles['box_150']} flex-col`} />
                      <span className={`${styles['text-group_157']}`}>功能菜单</span>
                    </div>
                  </div>
                  <div className={`${styles['group_187']} flex-row`}>
                    <div className={`${styles['image-text_290']} flex-col justify-between`}>
                      <div className={`${styles['block_112']} flex-col`} />
                      <span className={`${styles['text-group_158']}`}>功能菜单</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_328']} flex-row justify-between`}>
                  <div className={`${styles['group_189']} flex-row justify-end`}>
                    <div className={`${styles['box_329']} flex-col justify-between`}>
                      <div className={`${styles['text-group_319']} flex-col justify-between`}>
                        <span className={`${styles['text_693']}`}>功能菜单</span>
                        <span className={`${styles['text_694']}`}>70分钟&nbsp;|&nbsp;40℃</span>
                      </div>
                      <div className={`${styles['text-wrapper_193']} flex-col`}>
                        <span className={`${styles['text_695']}`}>参数设置</span>
                      </div>
                    </div>
                    <div className={`${styles['box_330']} flex-col justify-between`}>
                      <img
                        className={`${styles['label_202']}`}
                        src={
                          require('./assets/img/SketchPng238f4a7b5b762693de8f461e4224ae24a2ccfe3c301b8a982781ee9c858c2c76.png')
                        }
                      />
                      <div className={`${styles['group_190']} flex-col`} />
                    </div>
                  </div>
                  <div className={`${styles['group_191']} flex-row`}>
                    <div className={`${styles['text-group_320']} flex-col justify-between`}>
                      <span className={`${styles['text_696']}`}>功能菜单</span>
                      <span className={`${styles['text_697']}`}>70分钟&nbsp;|&nbsp;40℃</span>
                    </div>
                    <div className={`${styles['box_153']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['box_331']} flex-row justify-between`}>
                  <div className={`${styles['box_154']} flex-row`}>
                    <div className={`${styles['text-group_321']} flex-col justify-between`}>
                      <span className={`${styles['text_698']}`}>功能菜单</span>
                      <span className={`${styles['text_699']}`}>70分钟&nbsp;|&nbsp;40℃</span>
                    </div>
                    <div className={`${styles['group_193']} flex-col`} />
                  </div>
                  <div className={`${styles['box_155']} flex-row justify-around`}>
                    <div className={`${styles['text-group_322']} flex-col justify-between`}>
                      <span className={`${styles['text_700']}`}>功能菜单</span>
                      <span className={`${styles['text_701']}`}>70分钟&nbsp;|&nbsp;40℃</span>
                    </div>
                    <div className={`${styles['box_156']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['box_332']} flex-row`}>
                  <div className={`${styles['group_195']} flex-col`}>
                    <div className={`${styles['box_333']} flex-row justify-between`}>
                      <div className={`${styles['box_158']} flex-col`} />
                      <img
                        className={`${styles['label_203']}`}
                        src={
                          require('./assets/img/SketchPngb124a682bb35550ee762a54ff521d094abb91d76266b707779b1fe4b78169576.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_323']} flex-col justify-between`}>
                      <span className={`${styles['text_702']}`}>功能菜单</span>
                      <span className={`${styles['text_703']}`}>102分钟&nbsp;|&nbsp;60℃</span>
                    </div>
                    <div className={`${styles['text-wrapper_194']} flex-col`}>
                      <span className={`${styles['text_704']}`}>参数调节</span>
                    </div>
                  </div>
                  <div className={`${styles['group_196']} flex-col justify-end`}>
                    <div className={`${styles['box_159']} flex-col`} />
                    <span className={`${styles['text_705']}`}>功能菜单</span>
                    <div className={`${styles['text-wrapper_195']} flex-col`}>
                      <span className={`${styles['text_706']}`}>参数调节</span>
                    </div>
                    <span className={`${styles['text_707']}`}>102分钟&nbsp;|&nbsp;60℃</span>
                  </div>
                  <div className={`${styles['group_197']} flex-col`}>
                    <div className={`${styles['box_160']} flex-col`} />
                    <div className={`${styles['text-group_324']} flex-col justify-between`}>
                      <span className={`${styles['text_708']}`}>功能菜单</span>
                      <span className={`${styles['text_709']}`}>102分钟&nbsp;|&nbsp;60℃</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_334']} flex-row`}>
                  <div className={`${styles['block_113']} flex-col`}>
                    <div className={`${styles['box_161']} flex-row`}>
                      <div className={`${styles['image-text_291']} flex-col justify-between`}>
                        <div className={`${styles['group_338']} flex-col`}>
                          <div className={`${styles['group_199']} flex-col`} />
                        </div>
                        <span className={`${styles['text-group_165']}`}>功能</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['block_114']} flex-col`}>
                    <div className={`${styles['box_162']} flex-row`}>
                      <div className={`${styles['image-text_292']} flex-col justify-between`}>
                        <div className={`${styles['block_182']} flex-col`}>
                          <div className={`${styles['group_200']} flex-col`} />
                        </div>
                        <span className={`${styles['text-group_166']}`}>功能</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['block_116']} flex-col`}>
                    <div className={`${styles['box_163']} flex-row`}>
                      <div className={`${styles['image-text_293']} flex-col justify-between`}>
                        <div className={`${styles['section_150']} flex-col`}>
                          <div className={`${styles['section_69']} flex-col`} />
                        </div>
                        <span className={`${styles['text-group_167']}`}>功能</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_339']} flex-col`}>
                <div className={`${styles['box_335']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_134']}`}
                    src={
                      require('./assets/img/SketchPng86962225c2991957dbdd4c0e36d8383c059708cf9a48f9f14985708f445a8c32.png')
                    }
                  />
                  <div className={`${styles['box_164']} flex-col`}>
                    <div className={`${styles['text-wrapper_425']} flex-row justify-between`}>
                      <span className={`${styles['text_710']}`}>-17</span>
                      <span className={`${styles['text_711']}`}>°C</span>
                    </div>
                    <div className={`${styles['text-wrapper_426']} flex-row`}>
                      <span className={`${styles['text_712']}`}>冷冻室</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_336']} flex-row`}>
                  <div className={`${styles['box_165']} flex-col`}>
                    <div className={`${styles['text-wrapper_427']} flex-row justify-between`}>
                      <span className={`${styles['text_713']}`}>-2</span>
                      <span className={`${styles['text_714']}`}>°C</span>
                    </div>
                    <span className={`${styles['text_715']}`}>冷藏室</span>
                  </div>
                  <div className={`${styles['box_166']} flex-row`}>
                    <div className={`${styles['text-group_325']} flex-col justify-between`}>
                      <span className={`${styles['text_716']}`}>0</span>
                      <span className={`${styles['text_717']}`}>变温室</span>
                    </div>
                    <span className={`${styles['text_718']}`}>°C</span>
                  </div>
                  <div className={`${styles['box_167']} flex-col`}>
                    <div className={`${styles['text-wrapper_428']} flex-row justify-between`}>
                      <span className={`${styles['text_719']}`}>-17</span>
                      <span className={`${styles['text_720']}`}>°C</span>
                    </div>
                    <div className={`${styles['text-wrapper_429']} flex-row`}>
                      <span className={`${styles['text_721']}`}>冷冻室</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_72']} flex-row`}>
                  <img
                    className={`${styles['label_135']}`}
                    src={
                      require('./assets/img/SketchPng1a507fc61ed04f871ba831a66e8d5e1357ec34bcea410f6e1748c0f070aa5f32.png')
                    }
                  />
                  <div className={`${styles['group_340']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_430']} flex-row justify-between`}>
                      <span className={`${styles['text_722']}`}>60</span>
                      <span className={`${styles['text_723']}`}>°F</span>
                    </div>
                    <span className={`${styles['text_724']}`}>设置湿度</span>
                  </div>
                  <img
                    className={`${styles['label_136']}`}
                    src={
                      require('./assets/img/SketchPngc55b14660b3c06b5b242dd93ec2d51f889e36f7a013ed98167b42302c09611e9.png')
                    }
                  />
                </div>
                <div className={`${styles['section_73']} flex-col`}>
                  <div className={`${styles['group_341']} flex-row`}>
                    <img
                      className={`${styles['label_137']}`}
                      src={
                        require('./assets/img/SketchPng1a507fc61ed04f871ba831a66e8d5e1357ec34bcea410f6e1748c0f070aa5f32.png')
                      }
                    />
                    <span className={`${styles['text_725']}`}>26.5</span>
                    <span className={`${styles['text_726']}`}>°F</span>
                    <img
                      className={`${styles['label_138']}`}
                      src={
                        require('./assets/img/SketchPngc55b14660b3c06b5b242dd93ec2d51f889e36f7a013ed98167b42302c09611e9.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_173']}`}
                    src={
                      require('./assets/img/SketchPng9793e6a5668c894bd0762a457a88c0a048fcbd02c1e61fc94260b41ef4a93895.png')
                    }
                  />
                </div>
                <div className={`${styles['section_74']} flex-col`}>
                  <div className={`${styles['group_342']} flex-row`}>
                    <img
                      className={`${styles['label_139']}`}
                      src={
                        require('./assets/img/SketchPng1a507fc61ed04f871ba831a66e8d5e1357ec34bcea410f6e1748c0f070aa5f32.png')
                      }
                    />
                    <span className={`${styles['text_727']}`}>1</span>
                    <span className={`${styles['text_728']}`}>档</span>
                    <img
                      className={`${styles['label_140']}`}
                      src={
                        require('./assets/img/SketchPngc55b14660b3c06b5b242dd93ec2d51f889e36f7a013ed98167b42302c09611e9.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-text_294']} flex-col justify-between`}>
                    <img
                      className={`${styles['image_174']}`}
                      src={
                        require('./assets/img/SketchPng9c8863e8f1e8fc07a15fc65a3c2467645aa373b4f1636272c852bbd31d0ce4da.png')
                      }
                    />
                    <div className={`${styles['text-group_326']} flex-row justify-between`}>
                      <span className={`${styles['text_729']}`}>1</span>
                      <span className={`${styles['text_730']}`}>2</span>
                      <span className={`${styles['text_731']}`}>3</span>
                      <span className={`${styles['text_732']}`}>4</span>
                      <span className={`${styles['text_733']}`}>5</span>
                    </div>
                  </div>
                </div>
                <span className={`${styles['text_734']}`}>常用于主要功能操作</span>
              </div>
              <div className={`${styles['group_343']} flex-col`}>
                <div className={`${styles['group_204']} flex-row`}>
                  <div className={`${styles['group_344']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_431']} flex-row justify-between`}>
                      <span className={`${styles['text_735']}`}>-&nbsp;-</span>
                      <span className={`${styles['text_736']}`}>次</span>
                    </div>
                    <span className={`${styles['text_737']}`}>描述</span>
                  </div>
                  <img
                    className={`${styles['image_175']}`}
                    src={
                      require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                    }
                  />
                  <div className={`${styles['text-wrapper_432']} flex-col justify-between`}>
                    <span className={`${styles['text_738']}`}>-&nbsp;-</span>
                    <span className={`${styles['text_739']}`}>描述</span>
                  </div>
                  <span className={`${styles['text_740']}`}>分</span>
                </div>
                <div className={`${styles['group_205']} flex-row`}>
                  <div className={`${styles['text-group_327']} flex-col justify-between`}>
                    <span className={`${styles['text_741']}`}>0</span>
                    <span className={`${styles['text_742']}`}>描述</span>
                  </div>
                  <span className={`${styles['text_743']}`}>次</span>
                  <img
                    className={`${styles['image_176']}`}
                    src={
                      require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                    }
                  />
                  <div className={`${styles['text-group_328']} flex-col justify-between`}>
                    <span className={`${styles['text_744']}`}>100</span>
                    <span className={`${styles['text_745']}`}>描述</span>
                  </div>
                  <span className={`${styles['text_746']}`}>分</span>
                </div>
                <div className={`${styles['group_206']} flex-row`}>
                  <div className={`${styles['group_345']} flex-row`}>
                    <div className={`${styles['text-group_329']} flex-col justify-between`}>
                      <span className={`${styles['text_747']}`}>0</span>
                      <span className={`${styles['text_748']}`}>描述</span>
                    </div>
                    <span className={`${styles['text_749']}`}>次</span>
                  </div>
                  <img
                    className={`${styles['image_177']}`}
                    src={
                      require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                    }
                  />
                  <div className={`${styles['group_346']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_433']} flex-row justify-between`}>
                      <span className={`${styles['text_750']}`}>64</span>
                      <span className={`${styles['text_751']}`}>天</span>
                    </div>
                    <span className={`${styles['text_752']}`}>描述</span>
                  </div>
                  <img
                    className={`${styles['image_178']}`}
                    src={
                      require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                    }
                  />
                  <div className={`${styles['text-group_330']} flex-col justify-between`}>
                    <span className={`${styles['text_753']}`}>100</span>
                    <span className={`${styles['text_754']}`}>描述</span>
                  </div>
                  <span className={`${styles['text_755']}`}>分</span>
                </div>
                <div className={`${styles['group_207']} flex-col`}>
                  <div className={`${styles['group_347']} flex-row`}>
                    <div className={`${styles['section_151']} flex-row`}>
                      <div className={`${styles['text-group_331']} flex-col justify-between`}>
                        <span className={`${styles['text_756']}`}>0</span>
                        <span className={`${styles['text_757']}`}>描述</span>
                      </div>
                      <span className={`${styles['text_758']}`}>次</span>
                    </div>
                    <img
                      className={`${styles['image_179']}`}
                      src={
                        require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                      }
                    />
                    <div className={`${styles['section_152']} flex-col justify-between`}>
                      <div className={`${styles['text-wrapper_434']} flex-row justify-between`}>
                        <span className={`${styles['text_759']}`}>64</span>
                        <span className={`${styles['text_760']}`}>天</span>
                      </div>
                      <span className={`${styles['text_761']}`}>描述</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['image_180']}`}
                    src={
                      require('./assets/img/SketchPng57b5b9a5c422b5ee9bf01e2624ecddcfdf29bda71f6d0d4f9bb675efc5780979.png')
                    }
                  />
                  <div className={`${styles['group_348']} flex-row`}>
                    <div className={`${styles['text-group_332']} flex-col justify-between`}>
                      <span className={`${styles['text_762']}`}>良好</span>
                      <span className={`${styles['text_763']}`}>描述</span>
                    </div>
                    <img
                      className={`${styles['image_181']}`}
                      src={
                        require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                      }
                    />
                    <div className={`${styles['box_337']} flex-col justify-between`}>
                      <div className={`${styles['text-wrapper_435']} flex-row justify-between`}>
                        <span className={`${styles['text_764']}`}>10</span>
                        <span className={`${styles['text_765']}`}>月</span>
                      </div>
                      <span className={`${styles['text_766']}`}>描述</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_209']} flex-col`}>
                  <div className={`${styles['box_338']} flex-row`}>
                    <div className={`${styles['box_339']} flex-row`}>
                      <div className={`${styles['text-group_333']} flex-col justify-between`}>
                        <span className={`${styles['text_767']}`}>0</span>
                        <span className={`${styles['text_768']}`}>描述</span>
                      </div>
                      <span className={`${styles['text_769']}`}>次</span>
                    </div>
                    <img
                      className={`${styles['image_182']}`}
                      src={
                        require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                      }
                    />
                    <div className={`${styles['box_340']} flex-col justify-between`}>
                      <div className={`${styles['text-wrapper_436']} flex-row justify-between`}>
                        <span className={`${styles['text_770']}`}>64</span>
                        <span className={`${styles['text_771']}`}>天</span>
                      </div>
                      <span className={`${styles['text_772']}`}>描述</span>
                    </div>
                    <img
                      className={`${styles['image_183']}`}
                      src={
                        require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                      }
                    />
                    <div className={`${styles['text-group_334']} flex-col justify-between`}>
                      <span className={`${styles['text_773']}`}>100</span>
                      <span className={`${styles['text_774']}`}>描述</span>
                    </div>
                    <span className={`${styles['text_775']}`}>分</span>
                  </div>
                  <img
                    className={`${styles['image_184']}`}
                    src={
                      require('./assets/img/SketchPng67e7b60012c2c7525b6e23d51a3c8602c54cb45ffe75970bceeb8b19c68d4366.png')
                    }
                  />
                  <div className={`${styles['box_341']} flex-row`}>
                    <div className={`${styles['text-group_335']} flex-col justify-between`}>
                      <span className={`${styles['text_776']}`}>差</span>
                      <span className={`${styles['text_777']}`}>描述</span>
                    </div>
                    <img
                      className={`${styles['image_185']}`}
                      src={
                        require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                      }
                    />
                    <div className={`${styles['section_153']} flex-col justify-between`}>
                      <div className={`${styles['text-wrapper_437']} flex-row justify-between`}>
                        <span className={`${styles['text_778']}`}>10</span>
                        <span className={`${styles['text_779']}`}>月</span>
                      </div>
                      <span className={`${styles['text_780']}`}>描述</span>
                    </div>
                    <img
                      className={`${styles['image_186']}`}
                      src={
                        require('./assets/img/SketchPngbd5eb6734ccbbd1db609473758c97a16c364608074bd347be7b465e233ffb537.png')
                      }
                    />
                    <div className={`${styles['text-group_336']} flex-col justify-between`}>
                      <span className={`${styles['text_781']}`}>0</span>
                      <span className={`${styles['text_782']}`}>描述</span>
                    </div>
                  </div>
                </div>
                <span className={`${styles['text_783']}`}>常用于日志等入口型数据展示</span>
              </div>
              <div className={`${styles['group_349']} flex-col`}>
                <div className={`${styles['section_77']} flex-row`}>
                  <div className={`${styles['image-text_295']} flex-col justify-end`}>
                    <div className={`${styles['group_216']} flex-row`}>
                      <img
                        className={`${styles['label_141']}`}
                        src={
                          require('./assets/img/SketchPng7664ba648ee0157c62a3edb7e1b6fc513a68d8c44c6f741c0132dfc7b96cb8f8.png')
                        }
                      />
                      <div className={`${styles['text-wrapper_209']}`}>
                        <span className={`${styles['text_784']}`}>180</span>
                        <span className={`${styles['text_785']}`}>天</span>
                      </div>
                    </div>
                    <span className={`${styles['text-group_180']}`}>复合滤芯</span>
                  </div>
                  <div className={`${styles['image-text_296']} flex-col justify-end`}>
                    <div className={`${styles['group_217']} flex-col`}>
                      <div className={`${styles['text-wrapper_210']} flex-col`}>
                        <span className={`${styles['text_786']}`}>368天</span>
                      </div>
                    </div>
                    <span className={`${styles['text-group_181']}`}>PP滤芯</span>
                  </div>
                  <div className={`${styles['image-text_297']} flex-col justify-end`}>
                    <div className={`${styles['box_173']} flex-row`}>
                      <img
                        className={`${styles['label_142']}`}
                        src={
                          require('./assets/img/SketchPng7be2ed5e4ee0ebad3e81d96c06b5c8d24091399304dcf314f9a5fcd8ecab6139.png')
                        }
                      />
                      <span className={`${styles['text_787']}`}>60天</span>
                    </div>
                    <span className={`${styles['text-group_182']}`}>RO滤芯</span>
                  </div>
                </div>
                <div className={`${styles['section_78']} flex-row justify-between`}>
                  <div className={`${styles['image-text_298']} flex-row justify-end`}>
                    <div className={`${styles['block_119']} flex-row`}>
                      <img
                        className={`${styles['label_143']}`}
                        src={
                          require('./assets/img/SketchPng7664ba648ee0157c62a3edb7e1b6fc513a68d8c44c6f741c0132dfc7b96cb8f8.png')
                        }
                      />
                      <span className={`${styles['text_788']}`}>50%</span>
                    </div>
                    <div className={`${styles['text-group_337']} flex-col justify-between`}>
                      <span className={`${styles['text_789']}`}>剩余盐量</span>
                      <span className={`${styles['text_790']}`}>剩余盐量可以用100天</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_144']}`}
                    src={
                      require('./assets/img/SketchPng0b17d08e909f980fce9e9cbb78eb0bb456c12336a6bcbe7ad31abe5a6ac2cc21.png')
                    }
                  />
                </div>
                <div className={`${styles['section_79']} flex-row justify-between`}>
                  <div className={`${styles['image-text_299']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_145']}`}
                      src={
                        require('./assets/img/SketchPng280cd536b1114eaa005376a74be7fcba57d96b237a716a18effca413d817af43.png')
                      }
                    />
                    <span className={`${styles['text-group_184']}`}>查看滤芯更换方法</span>
                  </div>
                  <img
                    className={`${styles['label_146']}`}
                    src={
                      require('./assets/img/SketchPng0b17d08e909f980fce9e9cbb78eb0bb456c12336a6bcbe7ad31abe5a6ac2cc21.png')
                    }
                  />
                </div>
                <div className={`${styles['section_80']} flex-row`}>
                  <div className={`${styles['image-text_300']} flex-row justify-between`}>
                    <div className={`${styles['section_81']} flex-col`} />
                    <span className={`${styles['text-group_185']}`}>正常使用中</span>
                  </div>
                  <img
                    className={`${styles['label_147']}`}
                    src={
                      require('./assets/img/SketchPng0b17d08e909f980fce9e9cbb78eb0bb456c12336a6bcbe7ad31abe5a6ac2cc21.png')
                    }
                  />
                  <div className={`${styles['image-text_301']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_148']}`}
                      src={
                        require('./assets/img/SketchPngd64dff87fe810a2b2252ddd3879342242b2c75f7e38ba4da79634711c1f77d80.png')
                      }
                    />
                    <span className={`${styles['text-group_186']}`}>购买滤芯</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_350']} flex-col`}>
                <div className={`${styles['box_342']} flex-row justify-between`}>
                  <span className={`${styles['text_791']}`}>自动化</span>
                  <div className={`${styles['image-text_302']} flex-row justify-between`}>
                    <span className={`${styles['text-group_187']}`}>添加</span>
                    <img
                      className={`${styles['label_149']}`}
                      src={
                        require('./assets/img/SketchPng75b97398ea4c557c1c3a311e57195f3dfced11a8f12507170968560d525b49b9.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_121']} flex-row`}>
                  <div className={`${styles['text-group_338']} flex-col justify-between`}>
                    <span className={`${styles['text_792']}`}>无忧静眠</span>
                    <span className={`${styles['text_793']}`}>到达家里开灯</span>
                  </div>
                  <div className={`${styles['image-wrapper_108']} flex-col`}>
                    <img
                      className={`${styles['image_236']}`}
                      src={
                        require('./assets/img/SketchPng47985a22545e19fd2755bdc603fc65c9e539371645bb161a421abff8dd2a93a0.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['box_343']} flex-row justify-between`}>
                  <span className={`${styles['text_794']}`}>自动化</span>
                  <div className={`${styles['image-text_303']} flex-row justify-between`}>
                    <span className={`${styles['text-group_189']}`}>更多</span>
                    <img
                      className={`${styles['label_150']}`}
                      src={
                        require('./assets/img/SketchPng075a5ffce4eb663176ce20f8ba03cb91b8f2b1d0ef9943badecc405925a76a53.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_123']} flex-row`}>
                  <div className={`${styles['image-text_304']} flex-row justify-between`}>
                    <div className={`${styles['text-group_339']} flex-col justify-between`}>
                      <span className={`${styles['text_795']}`}>无忧静眠</span>
                      <span className={`${styles['text_796']}`}>到达家里开灯</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_92']}`}
                      src={
                        require('./assets/img/SketchPnge90c36c2eb1aaff4bfd5b2d89f4b5efa84d287ef553589a6a537ca71e8bba932.png')
                      }
                    />
                  </div>
                  <div className={`${styles['image-wrapper_109']} flex-col`}>
                    <img
                      className={`${styles['image_237']}`}
                      src={
                        require('./assets/img/SketchPng47985a22545e19fd2755bdc603fc65c9e539371645bb161a421abff8dd2a93a0.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_124']} flex-row`}>
                  <div className={`${styles['text-group_340']} flex-col justify-between`}>
                    <span className={`${styles['text_797']}`}>自动节能模式</span>
                    <span className={`${styles['text_798']}`}>监控门禁安全</span>
                  </div>
                  <div className={`${styles['image-wrapper_110']} flex-col`}>
                    <img
                      className={`${styles['image_238']}`}
                      src={
                        require('./assets/img/SketchPng47985a22545e19fd2755bdc603fc65c9e539371645bb161a421abff8dd2a93a0.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['box_344']} flex-row justify-between`}>
                  <span className={`${styles['text_799']}`}>自动化</span>
                  <div className={`${styles['image-text_305']} flex-row justify-between`}>
                    <span className={`${styles['text-group_192']}`}>更多</span>
                    <img
                      className={`${styles['label_151']}`}
                      src={
                        require('./assets/img/SketchPng075a5ffce4eb663176ce20f8ba03cb91b8f2b1d0ef9943badecc405925a76a53.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_126']} flex-row`}>
                  <div className={`${styles['text-group_341']} flex-col justify-between`}>
                    <span className={`${styles['text_800']}`}>无忧静眠</span>
                    <span className={`${styles['text_801']}`}>关键设备被删除，场景已失效</span>
                  </div>
                </div>
                <div className={`${styles['block_127']} flex-row`}>
                  <div className={`${styles['text-group_342']} flex-col justify-between`}>
                    <span className={`${styles['text_802']}`}>自动节能模式</span>
                    <span className={`${styles['text_803']}`}>关键设备被删除，场景已失效</span>
                  </div>
                </div>
                <div className={`${styles['block_128']} flex-row`}>
                  <div className={`${styles['image-text_306']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_152']}`}
                      src={
                        require('./assets/img/SketchPng40d06ed0602ccb594caa0b9e63cac5a3afbd63d04f3a259fbea1f5cbe458277a.png')
                      }
                    />
                    <span className={`${styles['text-group_195']}`}>添加自动化</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_211']} flex-col`}>
                  <span className={`${styles['text_804']}`}>数据异常点击重试</span>
                </div>
              </div>
            </div>
            <div className={`${styles['section_154']} flex-row justify-between`}>
              <div className={`${styles['box_345']} flex-col justify-between`}>
                <div className={`${styles['box_346']} flex-row justify-between`}>
                  <span className={`${styles['text_1177']}`}>列表标题</span>
                  <img
                    className={`${styles['thumbnail_148']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['group_220']} flex-row`}>
                  <div className={`${styles['image-text_307']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_204']}`}
                      src={
                        require('./assets/img/SketchPngcd55207921653925b6cbb326217b7588bba704e26fc263067c3be91e3c5d72f4.png')
                      }
                    />
                    <span className={`${styles['text-group_196']}`}>列表标题</span>
                  </div>
                  <img
                    className={`${styles['image_239']}`}
                    src={
                      require('./assets/img/SketchPng47985a22545e19fd2755bdc603fc65c9e539371645bb161a421abff8dd2a93a0.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_347']} flex-col`}>
                <div className={`${styles['box_348']} flex-row justify-between`}>
                  <span className={`${styles['text_1178']}`}>列表标题</span>
                  <img
                    className={`${styles['thumbnail_149']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['box_349']} flex-row justify-between`}>
                  <span className={`${styles['text_1179']}`}>列表标题</span>
                  <img
                    className={`${styles['thumbnail_150']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
                <div className={`${styles['box_350']} flex-row justify-between`}>
                  <div className={`${styles['group_351']} flex-col`} />
                  <div className={`${styles['image-text_308']} flex-row justify-between`}>
                    <div className={`${styles['text-group_343']} flex-row`}>
                      <span className={`${styles['text_1180']}`}>永不</span>
                      <span className={`${styles['text_1181']}`}>列表标题</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_151']}`}
                      src={
                        require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['section_155']} flex-row justify-between`}>
              <div className={`${styles['box_351']} flex-row justify-between`}>
                <div className={`${styles['section_156']} flex-col`} />
                <div className={`${styles['image-text_309']} flex-row justify-between`}>
                  <div className={`${styles['text-group_344']} flex-row`}>
                    <span className={`${styles['text_1182']}`}>永不</span>
                    <span className={`${styles['text_1183']}`}>列表标题</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_152']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_352']} flex-row justify-between`}>
                <div className={`${styles['group_352']} flex-col`} />
                <div className={`${styles['image-text_310']} flex-row justify-between`}>
                  <div className={`${styles['text-group_345']} flex-row`}>
                    <span className={`${styles['text_1184']}`}>永不</span>
                    <span className={`${styles['text_1185']}`}>列表标题</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_153']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['box_180']} flex-col`}>
              <div className={`${styles['text-wrapper_438']} flex-row justify-between`}>
                <span className={`${styles['text_814']}`}>-2</span>
                <span className={`${styles['text_815']}`}>°C</span>
              </div>
              <span className={`${styles['text_816']}`}>冷藏室</span>
            </div>
          </div>
          <span className={`${styles['text_817']}`}>弹窗</span>
          <div className={`${styles['box_181']} flex-col`}>
            <div className={`${styles['text-wrapper_439']} flex-row`}>
              <span className={`${styles['text_818']}`}>底部抽屉</span>
              <span className={`${styles['text_819']}`}>居中弹窗</span>
              <span className={`${styles['text_820']}`}>图文弹窗</span>
            </div>
            <div className={`${styles['box_353']} flex-row`}>
              <div className={`${styles['group_353']} flex-col justify-between`}>
                <div className={`${styles['box_182']} flex-col`}>
                  <div className={`${styles['text-wrapper_214']} flex-col`}>
                    <span className={`${styles['text_821']}`}>设备名称</span>
                  </div>
                  <div className={`${styles['text-wrapper_215']} flex-col`}>
                    <span className={`${styles['text_822']}`}>请输入设备名称</span>
                  </div>
                  <div className={`${styles['group_226']} flex-col`} />
                  <div className={`${styles['group_227']} flex-row`}>
                    <div className={`${styles['text-wrapper_216']} flex-col`}>
                      <span className={`${styles['text_823']}`}>取消</span>
                    </div>
                    <div className={`${styles['text-wrapper_217']} flex-col`}>
                      <span className={`${styles['text_824']}`}>确定</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_183']} flex-col`}>
                  <div className={`${styles['text-wrapper_218']} flex-col`}>
                    <span className={`${styles['text_825']}`}>选择你要反馈的产品</span>
                  </div>
                  <div className={`${styles['box_184']} flex-row`}>
                    <div className={`${styles['image-text_311']} flex-row justify-between`}>
                      <div className={`${styles['box_185']} flex-col`}>
                        <div className={`${styles['box_186']} flex-col`}>
                          <div className={`${styles['box_187']} flex-col`}>
                            <div className={`${styles['group_228']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['label_154']}`}
                            src={
                              require('./assets/img/SketchPngf4ab47545f1942161a22e8ad426e3340c99af7754a3a2656065f2ccc85619cb9.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_346']} flex-col justify-between`}>
                        <span className={`${styles['text_826']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_827']}`}>RW-400PRO</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_188']} flex-row`}>
                    <div className={`${styles['image-text_312']} flex-row justify-between`}>
                      <div className={`${styles['group_229']} flex-col`}>
                        <div className={`${styles['image-wrapper_72']} flex-col`}>
                          <img
                            className={`${styles['label_155']}`}
                            src={
                              require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                            }
                          />
                        </div>
                        <img
                          className={`${styles['label_156']}`}
                          src={
                            require('./assets/img/SketchPng9e566c5e7dd59df728f9dbb6af6df6222d3e42337274031e65c561b90a5ad6dd.png')
                          }
                        />
                      </div>
                      <div className={`${styles['text-group_347']} flex-col justify-between`}>
                        <span className={`${styles['text_828']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_829']}`}>RW-400PRO</span>
                      </div>
                    </div>
                    <img
                      className={`${styles['label_157']}`}
                      src={
                        require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                      }
                    />
                  </div>
                  <div className={`${styles['box_189']} flex-row`}>
                    <div className={`${styles['image-text_313']} flex-row justify-between`}>
                      <div className={`${styles['box_190']} flex-col`}>
                        <div className={`${styles['group_230']} flex-col`}>
                          <div className={`${styles['box_191']} flex-col`}>
                            <div className={`${styles['group_231']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['label_158']}`}
                            src={
                              require('./assets/img/SketchPngf4ab47545f1942161a22e8ad426e3340c99af7754a3a2656065f2ccc85619cb9.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_348']} flex-col justify-between`}>
                        <span className={`${styles['text_830']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_831']}`}>RW-400PRO</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_192']} flex-row`}>
                    <div className={`${styles['image-text_314']} flex-row justify-between`}>
                      <div className={`${styles['group_232']} flex-col`}>
                        <div className={`${styles['image-wrapper_73']} flex-col`}>
                          <img
                            className={`${styles['label_159']}`}
                            src={
                              require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                            }
                          />
                        </div>
                        <img
                          className={`${styles['label_160']}`}
                          src={
                            require('./assets/img/SketchPng9e566c5e7dd59df728f9dbb6af6df6222d3e42337274031e65c561b90a5ad6dd.png')
                          }
                        />
                      </div>
                      <div className={`${styles['text-group_349']} flex-col justify-between`}>
                        <span className={`${styles['text_832']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_833']}`}>RW-400PRO</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_193']} flex-col`} />
                  <div className={`${styles['box_194']} flex-row`}>
                    <div className={`${styles['text-wrapper_219']} flex-col`}>
                      <span className={`${styles['text_834']}`}>取消</span>
                    </div>
                    <div className={`${styles['text-wrapper_220']} flex-col`}>
                      <span className={`${styles['text_835']}`}>确定</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_195']} flex-col justify-end`}>
                  <div className={`${styles['text-wrapper_221']} flex-col`}>
                    <span className={`${styles['text_836']}`}>选择产品的问题类型</span>
                  </div>
                  <div className={`${styles['text-wrapper_222']} flex-col`}>
                    <span className={`${styles['text_837']}`}>APP问题</span>
                  </div>
                  <div className={`${styles['box_196']} flex-row`}>
                    <span className={`${styles['text_838']}`}>设备问题</span>
                    <img
                      className={`${styles['label_161']}`}
                      src={
                        require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-wrapper_223']} flex-col`}>
                    <span className={`${styles['text_839']}`}>服务问题</span>
                  </div>
                  <div className={`${styles['text-wrapper_224']} flex-col`}>
                    <span className={`${styles['text_840']}`}>订单问题</span>
                  </div>
                  <div className={`${styles['text-wrapper_225']} flex-col`}>
                    <span className={`${styles['text_841']}`}>其他</span>
                  </div>
                  <div className={`${styles['box_197']} flex-col`}>
                    <div className={`${styles['text-wrapper_226']} flex-col`}>
                      <span className={`${styles['text_842']}`}>取消</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_354']} flex-col`}>
                <div className={`${styles['box_198']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_227']} flex-col justify-around`}>
                    <span className={`${styles['text_843']}`}>确定</span>
                    <span className={`${styles['text_844']}`}>更多</span>
                  </div>
                  <div className={`${styles['text-wrapper_228']} flex-col`}>
                    <span className={`${styles['text_845']}`}>取消</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_229']} flex-col`}>
                  <span className={`${styles['text_846']}`}>场景详细设置</span>
                </div>
                <div className={`${styles['box_199']} flex-col`}>
                  <div className={`${styles['box_354']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_230']} flex-col`}>
                      <span className={`${styles['text_847']}`}>1</span>
                    </div>
                    <span className={`${styles['text_848']}`}>当室内湿度低于64%，打开加湿器并开启自动模式</span>
                  </div>
                  <div className={`${styles['box_355']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_231']} flex-col`}>
                      <span className={`${styles['text_849']}`}>2</span>
                    </div>
                    <span className={`${styles['text_850']}`}>当室内湿度高于68%，关闭加湿器</span>
                  </div>
                  <div className={`${styles['box_356']} flex-row justify-between`}>
                    <div className={`${styles['box_357']} flex-col justify-between`}>
                      <div className={`${styles['text-wrapper_232']} flex-col`}>
                        <span className={`${styles['text_851']}`}>3</span>
                      </div>
                      <div className={`${styles['text-wrapper_233']} flex-col`}>
                        <span className={`${styles['text_852']}`}>4</span>
                      </div>
                      <div className={`${styles['text-wrapper_234']} flex-col`}>
                        <span className={`${styles['text_853']}`}>5</span>
                      </div>
                    </div>
                    <div className={`${styles['text-group_350']} flex-col`}>
                      <span className={`${styles['text_854']}`}>当室内湿度高于70%，打开空调并开启抽湿模式&nbsp;、24℃、风速自动</span>
                      <span className={`${styles['paragraph_17']}`}>
                        当室内湿度低于70%，打开空调并开启自动模式、
                        <br />
                        24℃、风速自动
                      </span>
                      <span className={`${styles['text_855']}`}>当室内PM2.5＞7，打开空气净化器并开启自动模式</span>
                    </div>
                  </div>
                  <div className={`${styles['box_358']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_235']} flex-col`}>
                      <span className={`${styles['text_856']}`}>6</span>
                    </div>
                    <span className={`${styles['text_857']}`}>当室内PM2.5&lt;5，关闭空气净化器</span>
                  </div>
                </div>
                <div className={`${styles['box_204']} flex-col`} />
                <div className={`${styles['text-wrapper_236']} flex-col`}>
                  <span className={`${styles['text_858']}`}>关闭</span>
                </div>
              </div>
              <div className={`${styles['group_355']} flex-col justify-between`}>
                <div className={`${styles['group_236']} flex-col justify-end`}>
                  <span className={`${styles['text_859']}`}>文本说明文字</span>
                  <div className={`${styles['text-wrapper_237']} flex-col`}>
                    <span className={`${styles['text_860']}`}>确定</span>
                  </div>
                </div>
                <div className={`${styles['group_237']} flex-col`}>
                  <div className={`${styles['text-wrapper_440']} flex-row`}>
                    <span className={`${styles['text_861']}`}>说明文字</span>
                  </div>
                  <div className={`${styles['text-wrapper_441']} flex-row justify-between`}>
                    <span className={`${styles['text_862']}`}>取消</span>
                    <span className={`${styles['text_863']}`}>确定</span>
                  </div>
                </div>
                <div className={`${styles['group_238']} flex-col justify-end`}>
                  <span className={`${styles['text_864']}`}>标题</span>
                  <span className={`${styles['text_865']}`}>平台变得更大了，我们增加了大约100个新的产品应用。</span>
                  <div className={`${styles['text-wrapper_240']} flex-col`}>
                    <span className={`${styles['text_866']}`}>确定</span>
                  </div>
                  <div className={`${styles['text-wrapper_241']} flex-col`}>
                    <span className={`${styles['text_867']}`}>更多</span>
                  </div>
                  <div className={`${styles['text-wrapper_242']} flex-col`}>
                    <span className={`${styles['text_868']}`}>取消</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_356']} flex-col justify-between`}>
                <div className={`${styles['section_85']} flex-col justify-end`}>
                  <div className={`${styles['text-group_351']} flex-col justify-between`}>
                    <span className={`${styles['text_869']}`}>未连接Wi-Fi</span>
                    <span className={`${styles['text_870']}`}>手机连接家庭Wi-Fi后才能添加设备</span>
                  </div>
                  <div className={`${styles['box_205']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_243']} flex-col`}>
                      <span className={`${styles['text_871']}`}>取消</span>
                    </div>
                    <div className={`${styles['text-wrapper_244']} flex-col`}>
                      <span className={`${styles['text_872']}`}>去连接</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_86']} flex-col justify-end`}>
                  <div className={`${styles['text-group_352']} flex-col justify-between`}>
                    <span className={`${styles['text_873']}`}>是否解绑设备？</span>
                    <span className={`${styles['text_874']}`}>主账号解绑设备，则名下所有分享账号都将解除绑定</span>
                  </div>
                  <div className={`${styles['group_240']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_245']} flex-col`}>
                      <span className={`${styles['text_875']}`}>解绑</span>
                    </div>
                    <div className={`${styles['text-wrapper_246']} flex-col`}>
                      <span className={`${styles['text_876']}`}>再看看</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_87']} flex-col justify-end`}>
                  <div className={`${styles['text-group_353']} flex-col justify-between`}>
                    <span className={`${styles['text_877']}`}>退出登录</span>
                    <span className={`${styles['text_878']}`}>确认退出此账号吗？</span>
                  </div>
                  <div className={`${styles['box_206']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_247']} flex-col`}>
                      <span className={`${styles['text_879']}`}>取消</span>
                    </div>
                    <div className={`${styles['text-wrapper_248']} flex-col`}>
                      <span className={`${styles['text_880']}`}>退出</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_241']} flex-col justify-end`}>
                <div className={`${styles['text-group_354']} flex-col justify-between`}>
                  <span className={`${styles['text_881']}`}>设备离线了</span>
                  <span className={`${styles['text_882']}`}>请确认设备已接通电源</span>
                </div>
                <div className={`${styles['text-wrapper_249']} flex-col`}>
                  <span className={`${styles['text_883']}`}>我知道了</span>
                </div>
              </div>
              <div className={`${styles['group_357']} flex-col`}>
                <div className={`${styles['group_243']} flex-col`}>
                  <div className={`${styles['block_129']} flex-col`}>
                    <img
                      className={`${styles['image_191']}`}
                      src={
                        require('./assets/img/SketchPng522173c9a44ade66e62cb387b1d12831a2d79ded195c0af87a03a5b67fcc77a8.png')
                      }
                    />
                    <span className={`${styles['text_884']}`}>发现新版本</span>
                    <div className={`${styles['text-wrapper_250']}`}>
                      <span className={`${styles['text_885']}`}>UPDAT</span>
                      <span className={`${styles['text_886']}`}>E</span>
                    </div>
                    <img
                      className={`${styles['image_192']}`}
                      src={
                        require('./assets/img/SketchPngfe286549b34f42cd26e489ee0e4540747f20ce79c4e4d3fbbf0ce16bb1a947f2.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-wrapper_251']}`}>
                    <span className={`${styles['text_887']}`}>1.</span>
                    <span className={`${styles['text_888']}`}></span>
                    <span className={`${styles['paragraph_18']}`}>
                      新增小组件，提升用户体验；
                      <br />
                      2.&nbsp;设备卡片宫格展示，优化排版；
                      <br />
                      3.&nbsp;新增商城礼品卡激活，尽情买买买；
                    </span>
                  </div>
                  <div className={`${styles['text-wrapper_252']} flex-col`}>
                    <span className={`${styles['text_889']}`}>立即升级</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_358']} flex-col`}>
                <div className={`${styles['section_88']} flex-col`}>
                  <span className={`${styles['text_890']}`}>设备离线，请检查连接状态</span>
                  <div className={`${styles['text-wrapper_253']}`}>
                    <span className={`${styles['paragraph_19']}`}>
                      1、设备是否正常供电
                      <br />
                      2、网络信号是否稳定
                      <br />
                    </span>
                    <span className={`${styles['text_891']}`}>3、</span>
                    <span className={`${styles['text_892']}`}>WiFi名称、密码是否修改，如有修改请重新添加设备</span>
                  </div>
                  <div className={`${styles['text-wrapper_254']} flex-col`}>
                    <span className={`${styles['text_893']}`}>我知道了</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span className={`${styles['text_894']}`}>选择器</span>
          <div className={`${styles['box_207']} flex-row`}>
            <div className={`${styles['box_359']} flex-col justify-between`}>
              <div className={`${styles['text-wrapper_255']} flex-col`}>
                <span className={`${styles['text_895']}`}>城市&nbsp;｜广州</span>
              </div>
              <div className={`${styles['box_208']} flex-col`}>
                <span className={`${styles['text_896']}`}>北京</span>
                <span className={`${styles['text_897']}`}>上海</span>
                <div className={`${styles['image-text_315']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_256']} flex-col`}>
                    <span className={`${styles['text_898']}`}>广州</span>
                  </div>
                  <span className={`${styles['text-group_209']}`}>深圳</span>
                </div>
                <span className={`${styles['text_899']}`}>佛山</span>
              </div>
              <div className={`${styles['box_209']} flex-row`}>
                <div className={`${styles['text-wrapper_257']} flex-col`}>
                  <span className={`${styles['text_900']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_258']} flex-col`}>
                  <span className={`${styles['text_901']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_360']} flex-col justify-between`}>
              <div className={`${styles['text-wrapper_259']} flex-col`}>
                <span className={`${styles['text_902']}`}>30分钟后｜&nbsp;13:00&nbsp;关机</span>
              </div>
              <div className={`${styles['box_210']} flex-col`}>
                <span className={`${styles['text_903']}`}>23.5</span>
                <span className={`${styles['text_904']}`}>24.0</span>
                <div className={`${styles['image-text_316']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_260']} flex-row`}>
                    <span className={`${styles['text_905']}`}>0.5</span>
                    <span className={`${styles['text_906']}`}>小时后关机</span>
                  </div>
                  <span className={`${styles['text-group_210']}`}>1.0</span>
                </div>
                <span className={`${styles['text_907']}`}>1.5</span>
              </div>
              <div className={`${styles['box_211']} flex-row`}>
                <div className={`${styles['text-wrapper_261']} flex-col`}>
                  <span className={`${styles['text_908']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_262']} flex-col`}>
                  <span className={`${styles['text_909']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_361']} flex-col justify-between`}>
              <div className={`${styles['text-wrapper_263']} flex-col`}>
                <span className={`${styles['text_910']}`}>今天｜&nbsp;24:21&nbsp;关机</span>
              </div>
              <div className={`${styles['box_212']} flex-col`}>
                <div className={`${styles['text-wrapper_442']} flex-row justify-between`}>
                  <span className={`${styles['text_911']}`}>22</span>
                  <span className={`${styles['text_912']}`}>19</span>
                </div>
                <div className={`${styles['text-wrapper_443']} flex-row justify-between`}>
                  <span className={`${styles['text_913']}`}>23</span>
                  <span className={`${styles['text_914']}`}>20</span>
                </div>
                <div className={`${styles['image-text_317']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_266']} flex-row`}>
                    <span className={`${styles['text_915']}`}>今天</span>
                    <span className={`${styles['text_916']}`}>24</span>
                    <span className={`${styles['text_917']}`}>21</span>
                  </div>
                  <div className={`${styles['text-group_355']} flex-row`}>
                    <span className={`${styles['text_918']}`}>明天</span>
                    <span className={`${styles['text_919']}`}>1</span>
                    <span className={`${styles['text_920']}`}>22</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_444']} flex-row`}>
                  <span className={`${styles['text_921']}`}>后天</span>
                  <span className={`${styles['text_922']}`}>2</span>
                  <span className={`${styles['text_923']}`}>23</span>
                </div>
              </div>
              <div className={`${styles['box_213']} flex-row`}>
                <div className={`${styles['text-wrapper_268']} flex-col`}>
                  <span className={`${styles['text_924']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_269']} flex-col`}>
                  <span className={`${styles['text_925']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_362']} flex-col justify-between`}>
              <div className={`${styles['text-wrapper_270']} flex-col`}>
                <span className={`${styles['text_926']}`}>2026年&nbsp;8月&nbsp;23日</span>
              </div>
              <div className={`${styles['box_214']} flex-col`}>
                <div className={`${styles['text-wrapper_445']} flex-row`}>
                  <span className={`${styles['text_927']}`}>2024</span>
                  <span className={`${styles['text_928']}`}>6</span>
                  <span className={`${styles['text_929']}`}>21</span>
                </div>
                <div className={`${styles['text-wrapper_446']} flex-row`}>
                  <span className={`${styles['text_930']}`}>2025</span>
                  <span className={`${styles['text_931']}`}>7</span>
                  <span className={`${styles['text_932']}`}>22</span>
                </div>
                <div className={`${styles['image-text_318']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_273']} flex-row`}>
                    <span className={`${styles['text_933']}`}>2026</span>
                    <span className={`${styles['text_934']}`}>年</span>
                    <span className={`${styles['text_935']}`}>8</span>
                    <span className={`${styles['text_936']}`}>月</span>
                    <span className={`${styles['text_937']}`}>23</span>
                    <span className={`${styles['text_938']}`}>日</span>
                  </div>
                  <div className={`${styles['text-group_356']} flex-row`}>
                    <span className={`${styles['text_939']}`}>2027</span>
                    <span className={`${styles['text_940']}`}>9</span>
                    <span className={`${styles['text_941']}`}>24</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_447']} flex-row`}>
                  <span className={`${styles['text_942']}`}>2028</span>
                  <span className={`${styles['text_943']}`}>10</span>
                  <span className={`${styles['text_944']}`}>25</span>
                </div>
              </div>
              <div className={`${styles['box_215']} flex-row`}>
                <div className={`${styles['text-wrapper_275']} flex-col`}>
                  <span className={`${styles['text_945']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_276']} flex-col`}>
                  <span className={`${styles['text_946']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_363']} flex-col justify-between`}>
              <div className={`${styles['text-wrapper_277']} flex-col`}>
                <span className={`${styles['text_947']}`}>17：54</span>
              </div>
              <div className={`${styles['block_135']} flex-col`}>
                <div className={`${styles['text-wrapper_448']} flex-row justify-between`}>
                  <span className={`${styles['text_948']}`}>15</span>
                  <span className={`${styles['text_949']}`}>52</span>
                </div>
                <div className={`${styles['text-wrapper_449']} flex-row justify-between`}>
                  <span className={`${styles['text_950']}`}>16</span>
                  <span className={`${styles['text_951']}`}>53</span>
                </div>
                <div className={`${styles['image-text_319']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_280']} flex-row`}>
                    <span className={`${styles['text_952']}`}>17</span>
                    <span className={`${styles['text_953']}`}>时</span>
                    <span className={`${styles['text_954']}`}>54</span>
                    <span className={`${styles['text_955']}`}>分</span>
                  </div>
                  <div className={`${styles['text-group_357']} flex-row justify-between`}>
                    <span className={`${styles['text_956']}`}>18</span>
                    <span className={`${styles['text_957']}`}>55</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_450']} flex-row justify-between`}>
                  <span className={`${styles['text_958']}`}>19</span>
                  <span className={`${styles['text_959']}`}>56</span>
                </div>
              </div>
              <div className={`${styles['block_136']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_282']} flex-col`}>
                  <span className={`${styles['text_960']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_283']} flex-col`}>
                  <span className={`${styles['text_961']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_364']} flex-col justify-between`}>
              <div className={`${styles['text-wrapper_284']} flex-col`}>
                <span className={`${styles['text_962']}`}>重复周期</span>
              </div>
              <div className={`${styles['block_138']} flex-col justify-between`}>
                <div className={`${styles['group_245']} flex-row justify-between`}>
                  <span className={`${styles['text_963']}`}>执行一次</span>
                  <img
                    className={`${styles['label_162']}`}
                    src={
                      require('./assets/img/SketchPnge8b890efd422f020c641ec9abff57f9e38366aa12d40e4020ec9c584101ee00f.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_285']} flex-col`}>
                  <span className={`${styles['text_964']}`}>每天</span>
                </div>
                <div className={`${styles['text-wrapper_286']} flex-col`}>
                  <span className={`${styles['text_965']}`}>法定工作日</span>
                </div>
                <div className={`${styles['text-wrapper_287']} flex-col`}>
                  <span className={`${styles['text_966']}`}>法定节假日</span>
                </div>
                <div className={`${styles['text-wrapper_288']} flex-col`}>
                  <span className={`${styles['text_967']}`}>自定义</span>
                </div>
              </div>
              <div className={`${styles['block_139']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_289']} flex-col`}>
                  <span className={`${styles['text_968']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_290']} flex-col`}>
                  <span className={`${styles['text_969']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_365']} flex-col justify-between`}>
              <div className={`${styles['group_246']} flex-row`}>
                <img
                  className={`${styles['thumbnail_99']}`}
                  src={
                    require('./assets/img/SketchPng3d548b76b10740663742229b0c51d8a591b2381c7c4db5e8930cc231cda4921e.png')
                  }
                />
                <span className={`${styles['text_970']}`}>自定义</span>
              </div>
              <div className={`${styles['group_247']} flex-col justify-between`}>
                <div className={`${styles['text-wrapper_291']} flex-col`}>
                  <span className={`${styles['text_971']}`}>周日</span>
                </div>
                <div className={`${styles['text-wrapper_292']} flex-col`}>
                  <span className={`${styles['text_972']}`}>周一</span>
                </div>
                <div className={`${styles['text-wrapper_293']} flex-col`}>
                  <span className={`${styles['text_973']}`}>周二</span>
                </div>
                <div className={`${styles['box_216']} flex-row justify-between`}>
                  <span className={`${styles['text_974']}`}>周三</span>
                  <img
                    className={`${styles['label_163']}`}
                    src={
                      require('./assets/img/SketchPngac6b5195de53b15190c380d49823118ed062d20ee356eda232e1e6e3028c8f03.png')
                    }
                  />
                </div>
                <div className={`${styles['box_217']} flex-row justify-between`}>
                  <span className={`${styles['text_975']}`}>周四</span>
                  <img
                    className={`${styles['label_164']}`}
                    src={
                      require('./assets/img/SketchPngac6b5195de53b15190c380d49823118ed062d20ee356eda232e1e6e3028c8f03.png')
                    }
                  />
                </div>
                <div className={`${styles['box_218']} flex-row justify-between`}>
                  <span className={`${styles['text_976']}`}>周五</span>
                  <img
                    className={`${styles['label_165']}`}
                    src={
                      require('./assets/img/SketchPngac6b5195de53b15190c380d49823118ed062d20ee356eda232e1e6e3028c8f03.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_294']} flex-col`}>
                  <span className={`${styles['text_977']}`}>周六</span>
                </div>
              </div>
              <div className={`${styles['group_248']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_295']} flex-col`}>
                  <span className={`${styles['text_978']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_296']} flex-col`}>
                  <span className={`${styles['text_979']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['block_141']} flex-col justify-end`}>
              <div className={`${styles['box_219']} flex-row`}>
                <div className={`${styles['image-text_320']} flex-row justify-between`}>
                  <div className={`${styles['group_249']} flex-col`} />
                  <div className={`${styles['text-group_358']} flex-col justify-between`}>
                    <span className={`${styles['text_980']}`}>模式标题</span>
                    <span className={`${styles['text_981']}`}>模式一句话精准描述</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['box_220']} flex-row`}>
                <div className={`${styles['image-text_321']} flex-row justify-between`}>
                  <div className={`${styles['block_142']} flex-col`} />
                  <div className={`${styles['text-group_359']} flex-col justify-between`}>
                    <span className={`${styles['text_982']}`}>模式标题</span>
                    <span className={`${styles['text_983']}`}>模式一句话精准描述</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['box_221']} flex-row`}>
                <div className={`${styles['image-text_322']} flex-row justify-between`}>
                  <div className={`${styles['group_250']} flex-col`} />
                  <div className={`${styles['text-group_360']} flex-col justify-between`}>
                    <span className={`${styles['text_984']}`}>模式标题</span>
                    <span className={`${styles['text_985']}`}>模式一句话精准描述</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['box_222']} flex-row justify-between`}>
                <div className={`${styles['image-text_323']} flex-row justify-between`}>
                  <div className={`${styles['group_251']} flex-col`} />
                  <div className={`${styles['text-group_361']} flex-col justify-between`}>
                    <span className={`${styles['text_986']}`}>模式标题</span>
                    <span className={`${styles['text_987']}`}>模式一句话精准描述</span>
                  </div>
                </div>
                <img
                  className={`${styles['label_166']}`}
                  src={
                    require('./assets/img/SketchPng8be9083ef08a8ad7b72bdb129d565ab4413d148ad08d5038b04448003ba1cce4.png')
                  }
                />
              </div>
              <div className={`${styles['box_223']} flex-col`} />
              <div className={`${styles['box_224']} flex-col`}>
                <div className={`${styles['text-wrapper_297']} flex-col`}>
                  <span className={`${styles['text_988']}`}>取消</span>
                </div>
              </div>
            </div>
          </div>
          <span className={`${styles['text_989']}`}>插图</span>
          <div className={`${styles['box_225']} flex-col`}>
            <div className={`${styles['text-wrapper_451']} flex-row justify-between`}>
              <span className={`${styles['text_990']}`}>缺省图</span>
              <span className={`${styles['text_991']}`}>插图</span>
            </div>
            <div className={`${styles['box_366']} flex-row`}>
              <div className={`${styles['block_183']} flex-col justify-between`}>
                <div className={`${styles['box_227']} flex-col`}>
                  <img
                    className={`${styles['image_193']}`}
                    src={
                      require('./assets/img/SketchPng7d2321dde9b44255a8f4250b9500561087af54647199cb72173353df189e6ff3.png')
                    }
                  />
                  <span className={`${styles['text_992']}`}>添加失败</span>
                </div>
                <div className={`${styles['box_228']} flex-col`}>
                  <img
                    className={`${styles['image_194']}`}
                    src={
                      require('./assets/img/SketchPng7ed768f831c3163f31414b3df2322fd442426e696bf49be7a937617d94761cef.png')
                    }
                  />
                  <span className={`${styles['text_993']}`}>添加失败</span>
                </div>
              </div>
              <div className={`${styles['block_184']} flex-col justify-between`}>
                <div className={`${styles['section_89']} flex-col`}>
                  <img
                    className={`${styles['image_195']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['text_994']}`}>网络异常，请检查您的网络设置</span>
                  <div className={`${styles['text-wrapper_452']} flex-col`}>
                    <span className={`${styles['text_1186']}`}>检查</span>
                  </div>
                </div>
                <div className={`${styles['section_90']} flex-col`}>
                  <img
                    className={`${styles['image_196']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['text_996']}`}>暂无内容</span>
                </div>
                <div className={`${styles['section_91']} flex-col`}>
                  <img
                    className={`${styles['image_197']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['text_997']}`}>找不到页面</span>
                </div>
              </div>
              <div className={`${styles['block_185']} flex-col justify-between`}>
                <div className={`${styles['box_229']} flex-col`}>
                  <img
                    className={`${styles['image_198']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['paragraph_20']}`}>
                    当前版本较低
                    <br />
                    请更新到最新版APP
                  </span>
                </div>
                <div className={`${styles['box_230']} flex-col`}>
                  <img
                    className={`${styles['image_199']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['text_998']}`}>暂无设备，去添加</span>
                </div>
                <div className={`${styles['box_231']} flex-col`}>
                  <img
                    className={`${styles['image_200']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['text_999']}`}>抱歉&nbsp;没有找到“xx”相关的产品</span>
                </div>
              </div>
              <div className={`${styles['group_255']} flex-col`}>
                <div className={`${styles['box_367']} flex-row`}>
                  <span className={`${styles['text_1187']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_154']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_155']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_240']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_202']}`}
                  src={
                    require('./assets/img/SketchPngcd6f59ae29fec2fdd30c190898b5fc1b5cc5fd6d4643772ff66d2f63f7063883.png')
                  }
                />
                <div className={`${styles['group_257']} flex-col`}>
                  <div className={`${styles['block_186']} flex-row`}>
                    <span className={`${styles['text_1001']}`}>全屋</span>
                    <span className={`${styles['text_1002']}`}>客厅</span>
                    <span className={`${styles['text_1003']}`}>主卧</span>
                    <span className={`${styles['text_1004']}`}>次卧</span>
                    <span className={`${styles['text_1005']}`}>厨房</span>
                    <img
                      className={`${styles['label_167']}`}
                      src={
                        require('./assets/img/SketchPng74216ec7c9b1b1772e35bf97c8404f45ccc65ab1637b347ebc7480476cb9066a.png')
                      }
                    />
                  </div>
                  <div className={`${styles['block_187']} flex-row`}>
                    <div className={`${styles['section_92']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['group_260']} flex-col`}>
                  <img
                    className={`${styles['image_203']}`}
                    src={
                      require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                    }
                  />
                  <span className={`${styles['text_1006']}`}>暂无设备，去添加</span>
                </div>
                <img
                  className={`${styles['image_204']}`}
                  src={
                    require('./assets/img/SketchPng155e0d79b6df8a38dfba8c3633980afa1946cb8f8eb71417818fba085bf2ca52.png')
                  }
                />
              </div>
              <div className={`${styles['group_261']} flex-col`}>
                <div className={`${styles['block_188']} flex-row`}>
                  <span className={`${styles['text_1188']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_156']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_157']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_241']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['block_189']} flex-row`}>
                  <div className={`${styles['image-text_324']} flex-row justify-between`}>
                    <div className={`${styles['group_359']} flex-col`}>
                      <div className={`${styles['image-wrapper_111']} flex-col`}>
                        <img
                          className={`${styles['label_205']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_362']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_206']}`}
                  src={
                    require('./assets/img/SketchPng7ed768f831c3163f31414b3df2322fd442426e696bf49be7a937617d94761cef.png')
                  }
                />
                <span className={`${styles['text_1008']}`}>添加失败</span>
                <span className={`${styles['text_1009']}`}>*请确保您的Wi-Fi网络信号良好：</span>
                <div className={`${styles['block_190']} flex-row justify-between`}>
                  <span className={`${styles['text_1010']}`}>连接至设备热点</span>
                  <img
                    className={`${styles['thumbnail_158']}`}
                    src={
                      require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                    }
                  />
                </div>
                <div className={`${styles['block_191']} flex-row justify-between`}>
                  <span className={`${styles['text_1011']}`}>发送Wi-Fi认证至设备</span>
                  <img
                    className={`${styles['thumbnail_159']}`}
                    src={
                      require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                    }
                  />
                </div>
                <div className={`${styles['block_192']} flex-row justify-between`}>
                  <span className={`${styles['text_1012']}`}>连接至家庭Wi-Fi</span>
                  <img
                    className={`${styles['thumbnail_160']}`}
                    src={
                      require('./assets/img/SketchPngfbf4ab0ddb35947b473c05f644cd4777873b90ae36312d4b4c009e21d7105193.png')
                    }
                  />
                </div>
                <div className={`${styles['block_193']} flex-row justify-between`}>
                  <span className={`${styles['text_1013']}`}>绑定设备</span>
                  <div className={`${styles['section_93']} flex-col`} />
                </div>
                <div className={`${styles['text-wrapper_453']} flex-col`}>
                  <span className={`${styles['text_1189']}`}>再次配网</span>
                </div>
                <img
                  className={`${styles['image_242']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
                <div className={`${styles['text-wrapper_301']} flex-row`}>
                  <span className={`${styles['text_1015']}`}>0</span>
                  <span className={`${styles['text_1016']}`}>%</span>
                </div>
              </div>
              <div className={`${styles['block_194']} flex-col`}>
                <div className={`${styles['image-text_325']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_208']}`}
                    src={
                      require('./assets/img/SketchPng972677848a4835dd86b2754a18eadc99152fe1be60af6eeb2dfc6308103f2124.png')
                    }
                  />
                  <span className={`${styles['text-group_219']}`}>连接Wi-Fi网络</span>
                </div>
                <div className={`${styles['image-text_326']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_209']}`}
                    src={
                      require('./assets/img/SketchPng47e4cd1f751e318200768b0459bd36659b1cff7e660f19b8cbfa0f40f3107877.png')
                    }
                  />
                  <span className={`${styles['text-group_220']}`}>通过邮箱找回</span>
                </div>
                <div className={`${styles['image-text_327']} flex-col justify-between`}>
                  <img
                    className={`${styles['image_210']}`}
                    src={
                      require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
                    }
                  />
                  <div className={`${styles['text-group_221']}`}>
                    <span className={`${styles['paragraph_21']}`}>
                      验证码已发送到您的邮箱
                      <br />
                    </span>
                    <span className={`${styles['text_1017']}`}>599054675&#64;qq.com</span>
                    <span className={`${styles['text_1018']}`}>&nbsp;请输入验证码进行验证</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_269']} flex-col`}>
                <div className={`${styles['section_94']} flex-row`}>
                  <span className={`${styles['text_1019']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_107']}`}
                    src={
                      require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_108']}`}
                    src={
                      require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                    }
                  />
                  <img
                    className={`${styles['image_211']}`}
                    src={
                      require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                    }
                  />
                </div>
                <div className={`${styles['section_95']} flex-col`}>
                  <div className={`${styles['group_360']} flex-row`}>
                    <div className={`${styles['image-wrapper_112']} flex-col`}>
                      <img
                        className={`${styles['label_206']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text_1190']}`}>&nbsp;找回密码</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_212']}`}
                  src={
                    require('./assets/img/SketchPng47e4cd1f751e318200768b0459bd36659b1cff7e660f19b8cbfa0f40f3107877.png')
                  }
                />
                <span className={`${styles['text_1021']}`}>通过邮箱找回</span>
                <div className={`${styles['section_96']} flex-row`}>
                  <div className={`${styles['image-text_328']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_170']}`}
                      src={
                        require('./assets/img/SketchPng1a10c20eafcd764d76fa8f10da58f8799b36f13dd62fbe237a60ae103980858c.png')
                      }
                    />
                    <span className={`${styles['text-group_222']}`}>请输入您的邮箱账号</span>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_302']} flex-col`}>
                  <span className={`${styles['text_1022']}`}>下一步</span>
                </div>
                <span className={`${styles['text_1023']}`}>忘记账号</span>
                <img
                  className={`${styles['image_243']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['group_271']} flex-col`}>
                <div className={`${styles['group_272']} flex-row`}>
                  <span className={`${styles['text_1024']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_109']}`}
                    src={
                      require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_110']}`}
                    src={
                      require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                    }
                  />
                  <img
                    className={`${styles['image_214']}`}
                    src={
                      require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                    }
                  />
                </div>
                <div className={`${styles['group_273']} flex-col`}>
                  <div className={`${styles['section_157']} flex-row`}>
                    <div className={`${styles['image-wrapper_113']} flex-col`}>
                      <img
                        className={`${styles['label_207']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text_1191']}`}>&nbsp;邮箱验证</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_215']}`}
                  src={
                    require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
                  }
                />
                <div className={`${styles['text-wrapper_303']}`}>
                  <span className={`${styles['paragraph_22']}`}>
                    验证码已发送到您的邮箱
                    <br />
                  </span>
                  <span className={`${styles['text_1026']}`}>599054675&#64;qq.com</span>
                  <span className={`${styles['text_1027']}`}>&nbsp;请输入验证码进行验证</span>
                </div>
                <div className={`${styles['section_158']} flex-row`}>
                  <div className={`${styles['text-wrapper_304']} flex-col`}>
                    <span className={`${styles['text_1028']}`}>5</span>
                  </div>
                  <div className={`${styles['text-wrapper_305']} flex-col`}>
                    <span className={`${styles['text_1029']}`}>7</span>
                  </div>
                  <div className={`${styles['text-wrapper_306']} flex-col`}>
                    <span className={`${styles['text_1030']}`}>0</span>
                  </div>
                  <div className={`${styles['text-wrapper_307']} flex-col`}>
                    <span className={`${styles['text_1031']}`}>0</span>
                  </div>
                  <div className={`${styles['text-wrapper_308']} flex-col`}>
                    <span className={`${styles['text_1032']}`}>2</span>
                  </div>
                  <div className={`${styles['text-wrapper_309']} flex-col`}>
                    <span className={`${styles['text_1033']}`}>3</span>
                  </div>
                </div>
                <div className={`${styles['image-text_329']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_310']} flex-col`}>
                    <span className={`${styles['text_1034']}`}>确认</span>
                  </div>
                  <div className={`${styles['text-group_223']}`}>
                    <span className={`${styles['text_1035']}`}>没收到验证码？</span>
                    <span className={`${styles['text_1036']}`}>40S</span>
                    <span className={`${styles['text_1037']}`}></span>
                    <span className={`${styles['text_1038']}`}>重新发送</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_244']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['group_276']} flex-col`}>
                <div className={`${styles['group_361']} flex-row`}>
                  <span className={`${styles['text_1192']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_161']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_162']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_245']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['group_362']} flex-row`}>
                  <div className={`${styles['image-text_330']} flex-row justify-between`}>
                    <div className={`${styles['group_363']} flex-col`}>
                      <div className={`${styles['image-wrapper_114']} flex-col`}>
                        <img
                          className={`${styles['label_208']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_363']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_218']}`}
                  src={
                    require('./assets/img/SketchPngfc055759d5bc283e817a0cc1ebbc9b6136c666d5674405a25815edfdea0baff5.png')
                  }
                />
                <div className={`${styles['text-group_364']} flex-col justify-between`}>
                  <span className={`${styles['text_1040']}`}>连接Wi-Fi网络</span>
                  <span className={`${styles['paragraph_23']}`}>
                    *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                    <br />
                    请勿开启5GH频段。
                  </span>
                </div>
                <div className={`${styles['image-text_331']} flex-col justify-between`}>
                  <div className={`${styles['box_233']} flex-row`}>
                    <div className={`${styles['image-text_332']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_173']}`}
                        src={
                          require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                        }
                      />
                      <span className={`${styles['text-group_226']}`}>请选择您的家庭Wi-Fi</span>
                    </div>
                    <div className={`${styles['image-text_333']} flex-row justify-between`}>
                      <img
                        className={`${styles['label_173']}`}
                        src={
                          require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                        }
                      />
                      <span className={`${styles['text-group_226']}`}>请选择您的家庭Wi-Fi</span>
                    </div>
                  </div>
                  <span className={`${styles['text-group_227']}`}>没有连接到家庭Wi-Fi</span>
                </div>
                <div className={`${styles['block_145']} flex-row`}>
                  <div className={`${styles['image-text_334']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_174']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text-group_228']}`}>请输入Wi-Fi密码</span>
                  </div>
                  <img
                    className={`${styles['label_175']}`}
                    src={
                      require('./assets/img/SketchPng162c90f3ab0b519c590db2c74524d9fbb3fe34693848e9f9b87ee9f7486a56e3.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_454']} flex-col`}>
                  <span className={`${styles['text_1193']}`}>FAQ</span>
                </div>
                <div className={`${styles['text-wrapper_455']} flex-col`}>
                  <span className={`${styles['text_1194']}`}>下一步</span>
                </div>
                <img
                  className={`${styles['image_246']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['box_368']} flex-row`}>
              <div className={`${styles['box_235']} flex-col`}>
                <img
                  className={`${styles['image_220']}`}
                  src={
                    require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                  }
                />
                <span className={`${styles['text_1043']}`}>未设置定时</span>
              </div>
              <div className={`${styles['box_236']} flex-col`}>
                <img
                  className={`${styles['image_221']}`}
                  src={
                    require('./assets/img/SketchPng1a56aaefe83e203f8f220abfebd48944e8464daefc71b87d20d9b341e9a383c2.png')
                  }
                />
                <span className={`${styles['text_1044']}`}>无法获取地址，请手动定位</span>
                <div className={`${styles['image-text_335']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_456']} flex-col`}>
                    <span className={`${styles['text_1195']}`}>刷新</span>
                  </div>
                  <span className={`${styles['text-group_229']}`}>重新定位</span>
                </div>
              </div>
              <div className={`${styles['image-text_336']} flex-col justify-between`}>
                <img
                  className={`${styles['image_222']}`}
                  src={
                    require('./assets/img/SketchPng669b7fa9977d3896b5989e343fcaf791d855a146c8f25b941c4c8a554a511ec8.png')
                  }
                />
                <div className={`${styles['text-group_365']} flex-col justify-between`}>
                  <span className={`${styles['text_1046']}`}>反馈成功</span>
                  <span className={`${styles['text_1047']}`}>我们预计在1-3个工作日内回复</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
