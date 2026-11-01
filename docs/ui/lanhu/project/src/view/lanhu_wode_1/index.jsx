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
        <div className={`${styles['section_1']} flex-row`}>
          <div className={`${styles['text-wrapper_1']} flex-col`}>
            <span className={`${styles['text_1']}`}>我的操作流程</span>
          </div>
        </div>
        <div className={`${styles['section_2']} flex-row`}>
          <div className={`${styles['group_1']} flex-col`}>
            <div className={`${styles['group_2']} flex-row`}>
              <span className={`${styles['text_2']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_1']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_2']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_3']} flex-row`}>
              <div className={`${styles['group_4']} flex-col`}>
                <div className={`${styles['image-wrapper_1']} flex-col`}>
                  <img
                    className={`${styles['label_1']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_3']}`}>示例</span>
              <div className={`${styles['group_5']} flex-row`}>
                <div className={`${styles['box_1']} flex-col`}>
                  <div className={`${styles['image-wrapper_2']} flex-col`}>
                    <img
                      className={`${styles['label_2']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_4']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['group_6']} flex-row`}>
              <span className={`${styles['text_5']}`}>昵称</span>
              <span className={`${styles['text_6']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_7']} flex-row`}>
              <span className={`${styles['text_7']}`}>邮箱</span>
              <span className={`${styles['text_8']}`}>185202332299&#64;gmail.com</span>
              <img
                className={`${styles['thumbnail_4']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_8']} flex-row justify-between`}>
              <span className={`${styles['text_9']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_5']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_10']}`}>注销账号</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_11']}`}>退出登录</span>
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_3']}`}
            src={
              require('./assets/img/SketchPng92fc3422c54a47a876290103fab63b4e957214ba719a2a8d0a9f3aca63d56716.png')
            }
          />
          <div className={`${styles['group_9']} flex-col`}>
            <div className={`${styles['box_2']} flex-row`}>
              <span className={`${styles['text_12']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_6']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_7']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_4']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_3']} flex-row`}>
              <div className={`${styles['block_1']} flex-col`}>
                <div className={`${styles['image-wrapper_3']} flex-col`}>
                  <img
                    className={`${styles['label_3']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_13']}`}>示例</span>
              <div className={`${styles['block_2']} flex-row`}>
                <div className={`${styles['group_10']} flex-col`}>
                  <div className={`${styles['image-wrapper_4']} flex-col`}>
                    <img
                      className={`${styles['label_4']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_14']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['box_4']} flex-row`}>
              <span className={`${styles['text_15']}`}>昵称</span>
              <span className={`${styles['text_16']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_8']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_5']} flex-row`}>
              <span className={`${styles['text_17']}`}>邮箱</span>
              <span className={`${styles['text_18']}`}>185202332299&#64;gmail.com</span>
              <img
                className={`${styles['thumbnail_9']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_6']} flex-row justify-between`}>
              <span className={`${styles['text_19']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_10']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_7']} flex-col`}>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_20']}`}>修改昵称</span>
              </div>
              <div className={`${styles['text-wrapper_5']} flex-col`}>
                <span className={`${styles['text_21']}`}>Antarctic&nbsp;Star</span>
              </div>
              <div className={`${styles['group_11']} flex-col`} />
              <div className={`${styles['group_12']} flex-row`}>
                <div className={`${styles['text-wrapper_6']} flex-col`}>
                  <span className={`${styles['text_22']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_7']} flex-col`}>
                  <span className={`${styles['text_23']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['text-wrapper_8']} flex-col`}>
              <span className={`${styles['text_24']}`}>注销账号</span>
            </div>
            <div className={`${styles['text-wrapper_9']} flex-col`}>
              <span className={`${styles['text_25']}`}>退出登录</span>
            </div>
            <img
              className={`${styles['image_5']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['group_13']} flex-col`}>
            <div className={`${styles['box_8']} flex-col justify-between`}>
              <div className={`${styles['section_3']} flex-row`}>
                <span className={`${styles['text_26']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_11']}`}
                  src={
                    require('./assets/img/SketchPng325d2fa1ece785fee4dc9ea589119c84874834835de860e1e928f7f1b13cda74.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_12']}`}
                  src={
                    require('./assets/img/SketchPng0285d8ecfbb0be2837579864402e9d18b2678f35cf8800fd65973ed603ebf378.png')
                  }
                />
                <img
                  className={`${styles['image_6']}`}
                  src={
                    require('./assets/img/SketchPng665f1ec0b8e58ed4df63f45b45cad40290d2b813adaee780227ea5c660b1d6d5.png')
                  }
                />
              </div>
              <div className={`${styles['section_4']} flex-row`}>
                <img
                  className={`${styles['image_7']}`}
                  src={
                    require('./assets/img/SketchPnge6fcad463d36720b441ae929a5c02665da1a6d1ddf3ab826195a070118f43bba.png')
                  }
                />
                <div className={`${styles['text-wrapper_10']} flex-col justify-between`}>
                  <span className={`${styles['text_27']}`}>Antarctic&nbsp;Star</span>
                  <span className={`${styles['text_28']}`}>1***9&#64;gmail.com</span>
                </div>
                <img
                  className={`${styles['label_5']}`}
                  src={
                    require('./assets/img/SketchPngea1688bd6c2574d8de0f173f435c8ee15534e0d00d808446cc22a9064d674a8b.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['box_9']} flex-row`}>
              <img
                className={`${styles['label_6']}`}
                src={
                  require('./assets/img/SketchPng49f81c4d5fa9f8310ae4a79b16598b4f5491882a54735ab4d3c7fbfa3520d529.png')
                }
              />
              <span className={`${styles['text_29']}`}>房间管理</span>
              <img
                className={`${styles['thumbnail_13']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_10']} flex-row`}>
              <img
                className={`${styles['label_7']}`}
                src={
                  require('./assets/img/SketchPng67162c06bbc96560d0805308ee1d2b26b89ed5be90235e3d17adc8c684ddfbaf.png')
                }
              />
              <span className={`${styles['text_30']}`}>分享管理</span>
              <img
                className={`${styles['thumbnail_14']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_11']} flex-row`}>
              <img
                className={`${styles['label_8']}`}
                src={
                  require('./assets/img/SketchPng85fe7d07593fc1920a0b4d0cb45d6a8678d936c109017895b558657d3872895a.png')
                }
              />
              <span className={`${styles['text_31']}`}>语言</span>
              <span className={`${styles['text_32']}`}>跟随系统</span>
              <img
                className={`${styles['thumbnail_15']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_12']} flex-row`}>
              <img
                className={`${styles['label_9']}`}
                src={
                  require('./assets/img/SketchPng0ce7e0e23a249d8c85bd5936d6acff294b3c092ad601e809fc7e58d5c6f89a6b.png')
                }
              />
              <span className={`${styles['text_33']}`}>关于</span>
              <img
                className={`${styles['thumbnail_16']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_13']} flex-row`}>
              <img
                className={`${styles['label_10']}`}
                src={
                  require('./assets/img/SketchPng2726c51b44e2661210bc26a58c09d2f355e3e6dc01d2b334a97d698c4509b656.png')
                }
              />
              <span className={`${styles['text_34']}`}>联系我们</span>
              <img
                className={`${styles['thumbnail_17']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_14']} flex-row`}>
              <img
                className={`${styles['label_11']}`}
                src={
                  require('./assets/img/SketchPngc09d7eb9e329efe160bb010857c9110bada73491f2442a7029a889dfed178acf.png')
                }
              />
              <span className={`${styles['text_35']}`}>问题反馈</span>
              <img
                className={`${styles['thumbnail_18']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_15']} flex-row`}>
              <img
                className={`${styles['label_12']}`}
                src={
                  require('./assets/img/SketchPngf0c619e1b1ff390962ac7c1ce212c09b1ac87b8e8a536237648fb57a81104512.png')
                }
              />
              <span className={`${styles['text_36']}`}>访问官网</span>
              <img
                className={`${styles['thumbnail_19']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_16']} flex-row`}>
              <img
                className={`${styles['label_13']}`}
                src={
                  require('./assets/img/SketchPng0ee4c51237f5ce9060686a9b7808226fb7a85b5fccaf358f70b3f49117ce9e13.png')
                }
              />
              <span className={`${styles['text_37']}`}>产品说明书</span>
              <img
                className={`${styles['thumbnail_20']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_17']} flex-row`}>
              <img
                className={`${styles['label_14']}`}
                src={
                  require('./assets/img/SketchPng2c188398301d87a25347eb573cc7ec8a6f5fcb8004e5da4ab39c7fc6a89d227c.png')
                }
              />
              <span className={`${styles['text_38']}`}>常见问题</span>
              <img
                className={`${styles['thumbnail_21']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['box_18']} flex-col`}>
              <div className={`${styles['box_19']} flex-row justify-between`}>
                <img
                  className={`${styles['label_15']}`}
                  src={
                    require('./assets/img/SketchPng6474be6d59434eb9665cd87383de0156e2aa3437fe119c6f4285372db3a1c22b.png')
                  }
                />
                <span className={`${styles['text_39']}`}>语音控制</span>
              </div>
              <div className={`${styles['box_20']} flex-row justify-between`}>
                <div className={`${styles['group_14']} flex-row`}>
                  <img
                    className={`${styles['thumbnail_22']}`}
                    src={
                      require('./assets/img/SketchPng7b5aa43899614644b92020e77846ebc6f18615a252d39bc3b2f787424bfbd36a.png')
                    }
                  />
                  <span className={`${styles['text_40']}`}>Alexa</span>
                </div>
                <div className={`${styles['group_15']} flex-row`}>
                  <img
                    className={`${styles['thumbnail_23']}`}
                    src={
                      require('./assets/img/SketchPngb0313c7261831ab6863853011dfb1ec771bf6efaa44c2cc2f7af7841d929f922.png')
                    }
                  />
                  <span className={`${styles['text_41']}`}>Google&nbsp;Assi…</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_21']} flex-col justify-between`}>
              <div className={`${styles['box_22']} flex-row`}>
                <img
                  className={`${styles['label_16']}`}
                  src={
                    require('./assets/img/SketchPng48a9f50f5e4d8344972048129c54511b85c43757f84f55d14177b59591e46ba6.png')
                  }
                />
                <div className={`${styles['block_3']} flex-col`} />
                <img
                  className={`${styles['label_17']}`}
                  src={
                    require('./assets/img/SketchPng866cc62927075fa19b5d2d39a517aca7b82c2a03d2ddc26c5e1f7c8819270473.png')
                  }
                />
              </div>
              <img
                className={`${styles['image_8']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
            <div className={`${styles['image-wrapper_5']} flex-col`}>
              <img
                className={`${styles['thumbnail_24']}`}
                src={
                  require('./assets/img/SketchPng633c60adbae3a8a8f02dbc076d49708f1cdf17ff1a3df1e544363c0ef825b701.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['group_16']} flex-col`}>
            <div className={`${styles['group_17']} flex-row`}>
              <span className={`${styles['text_42']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_25']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_26']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_9']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_18']} flex-row`}>
              <div className={`${styles['block_4']} flex-col`}>
                <div className={`${styles['image-wrapper_6']} flex-col`}>
                  <img
                    className={`${styles['label_18']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_43']}`}>示例</span>
              <div className={`${styles['block_5']} flex-row`}>
                <div className={`${styles['group_19']} flex-col`}>
                  <div className={`${styles['image-wrapper_7']} flex-col`}>
                    <img
                      className={`${styles['label_19']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_44']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['group_20']} flex-row`}>
              <span className={`${styles['text_45']}`}>昵称</span>
              <span className={`${styles['text_46']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_27']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_21']} flex-row`}>
              <span className={`${styles['text_47']}`}>邮箱</span>
              <span className={`${styles['text_48']}`}>185202332299&#64;gmail.com</span>
              <img
                className={`${styles['thumbnail_28']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_22']} flex-row justify-between`}>
              <span className={`${styles['text_49']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_29']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_23']} flex-col`}>
              <div className={`${styles['text-wrapper_11']} flex-col`}>
                <span className={`${styles['text_50']}`}>修改邮箱</span>
              </div>
              <div className={`${styles['text-wrapper_12']} flex-col`}>
                <span className={`${styles['text_51']}`}>599054675&#64;qq.com</span>
              </div>
              <div className={`${styles['box_23']} flex-col`} />
              <div className={`${styles['box_24']} flex-col`}>
                <div className={`${styles['text-wrapper_13']} flex-col`}>
                  <span className={`${styles['text_52']}`}>下一步</span>
                </div>
              </div>
            </div>
            <div className={`${styles['text-wrapper_14']} flex-col`}>
              <span className={`${styles['text_53']}`}>注销账号</span>
            </div>
            <div className={`${styles['text-wrapper_15']} flex-col`}>
              <span className={`${styles['text_54']}`}>退出登录</span>
            </div>
            <img
              className={`${styles['image_10']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_11']}`}
            src={
              require('./assets/img/SketchPng92fc3422c54a47a876290103fab63b4e957214ba719a2a8d0a9f3aca63d56716.png')
            }
          />
          <div className={`${styles['group_24']} flex-col`}>
            <div className={`${styles['block_6']} flex-row`}>
              <span className={`${styles['text_55']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_30']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_31']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_12']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['block_7']} flex-col`}>
              <div className={`${styles['group_25']} flex-row`}>
                <div className={`${styles['image-wrapper_8']} flex-col`}>
                  <img
                    className={`${styles['label_20']}`}
                    src={
                      require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                    }
                  />
                </div>
                <span className={`${styles['text_56']}`}>&nbsp;邮箱验证</span>
              </div>
            </div>
            <img
              className={`${styles['image_13']}`}
              src={
                require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
              }
            />
            <div className={`${styles['text-wrapper_16']}`}>
              <span className={`${styles['paragraph_1']}`}>
                验证码已发送到您的邮箱
                <br />
              </span>
              <span className={`${styles['text_57']}`}>599054675&#64;qq.com</span>
              <span className={`${styles['text_58']}`}>&nbsp;请输入验证码进行验证</span>
            </div>
            <div className={`${styles['block_8']} flex-col`}>
              <div className={`${styles['image-wrapper_9']} flex-col`}>
                <img
                  className={`${styles['label_21']}`}
                  src={
                    require('./assets/img/SketchPngf6f1d3680ff60bf5bb8dc6e633125b0802d187f35658a2ab075e351094bd7c21.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['text-wrapper_17']} flex-col`}>
              <span className={`${styles['text_59']}`}>确认</span>
            </div>
            <div className={`${styles['text-wrapper_18']}`}>
              <span className={`${styles['text_60']}`}>没收到验证码？</span>
              <span className={`${styles['text_61']}`}>重新发送</span>
            </div>
            <img
              className={`${styles['image_14']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['group_26']} flex-col`}>
            <div className={`${styles['group_27']} flex-row`}>
              <span className={`${styles['text_62']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_32']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_33']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_15']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['group_28']} flex-col`}>
              <div className={`${styles['section_5']} flex-row`}>
                <div className={`${styles['image-wrapper_10']} flex-col`}>
                  <img
                    className={`${styles['label_22']}`}
                    src={
                      require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                    }
                  />
                </div>
                <span className={`${styles['text_63']}`}>&nbsp;邮箱验证</span>
              </div>
            </div>
            <img
              className={`${styles['image_16']}`}
              src={
                require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
              }
            />
            <div className={`${styles['text-wrapper_19']}`}>
              <span className={`${styles['paragraph_2']}`}>
                验证码已发送到您的邮箱
                <br />
              </span>
              <span className={`${styles['text_64']}`}>599054675&#64;qq.com</span>
              <span className={`${styles['text_65']}`}>&nbsp;请输入验证码进行验证</span>
            </div>
            <div className={`${styles['group_29']} flex-col`}>
              <div className={`${styles['text-wrapper_20']} flex-col`}>
                <span className={`${styles['text_66']}`}>发送成功</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_21']} flex-col`}>
              <span className={`${styles['text_67']}`}>确认</span>
            </div>
            <div className={`${styles['text-wrapper_22']}`}>
              <span className={`${styles['text_68']}`}>没收到验证码？</span>
              <span className={`${styles['text_69']}`}>59S</span>
              <span className={`${styles['text_70']}`}></span>
              <span className={`${styles['text_71']}`}>重新发送</span>
            </div>
            <img
              className={`${styles['image_17']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['group_30']} flex-col`}>
            <div className={`${styles['group_31']} flex-row`}>
              <span className={`${styles['text_72']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_34']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_35']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_18']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['group_32']} flex-col`}>
              <div className={`${styles['box_25']} flex-row`}>
                <div className={`${styles['image-wrapper_11']} flex-col`}>
                  <img
                    className={`${styles['label_23']}`}
                    src={
                      require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                    }
                  />
                </div>
                <span className={`${styles['text_73']}`}>&nbsp;邮箱验证</span>
              </div>
            </div>
            <img
              className={`${styles['image_19']}`}
              src={
                require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
              }
            />
            <div className={`${styles['text-wrapper_23']}`}>
              <span className={`${styles['paragraph_3']}`}>
                验证码已发送到您的邮箱
                <br />
              </span>
              <span className={`${styles['text_74']}`}>599054675&#64;qq.com</span>
              <span className={`${styles['text_75']}`}>&nbsp;请输入验证码进行验证</span>
            </div>
            <div className={`${styles['group_33']} flex-row`}>
              <div className={`${styles['text-wrapper_24']} flex-col`}>
                <span className={`${styles['text_76']}`}>5</span>
              </div>
              <div className={`${styles['text-wrapper_25']} flex-col`}>
                <span className={`${styles['text_77']}`}>7</span>
              </div>
              <div className={`${styles['text-wrapper_26']} flex-col`}>
                <span className={`${styles['text_78']}`}>0</span>
              </div>
              <div className={`${styles['group_34']} flex-col`} />
              <div className={`${styles['group_35']} flex-col`} />
              <div className={`${styles['group_36']} flex-col`} />
            </div>
            <div className={`${styles['text-wrapper_27']} flex-col`}>
              <span className={`${styles['text_79']}`}>确认</span>
            </div>
            <div className={`${styles['text-wrapper_28']}`}>
              <span className={`${styles['text_80']}`}>没收到验证码？</span>
              <span className={`${styles['text_81']}`}>40S</span>
              <span className={`${styles['text_82']}`}></span>
              <span className={`${styles['text_83']}`}>重新发送</span>
            </div>
            <div className={`${styles['image-wrapper_12']} flex-col`}>
              <img
                className={`${styles['image_20']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['group_37']} flex-col`}>
            <div className={`${styles['section_6']} flex-row`}>
              <span className={`${styles['text_84']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_36']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_37']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_21']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['section_7']} flex-col`}>
              <div className={`${styles['box_26']} flex-row`}>
                <div className={`${styles['image-wrapper_13']} flex-col`}>
                  <img
                    className={`${styles['label_24']}`}
                    src={
                      require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                    }
                  />
                </div>
                <span className={`${styles['text_85']}`}>&nbsp;邮箱验证</span>
              </div>
            </div>
            <img
              className={`${styles['image_22']}`}
              src={
                require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
              }
            />
            <div className={`${styles['text-wrapper_29']}`}>
              <span className={`${styles['paragraph_4']}`}>
                验证码已发送到您的邮箱
                <br />
              </span>
              <span className={`${styles['text_86']}`}>599054675&#64;qq.com</span>
              <span className={`${styles['text_87']}`}>&nbsp;请输入验证码进行验证</span>
            </div>
            <div className={`${styles['section_8']} flex-row`}>
              <div className={`${styles['text-wrapper_30']} flex-col`}>
                <span className={`${styles['text_88']}`}>5</span>
              </div>
              <div className={`${styles['text-wrapper_31']} flex-col`}>
                <span className={`${styles['text_89']}`}>7</span>
              </div>
              <div className={`${styles['text-wrapper_32']} flex-col`}>
                <span className={`${styles['text_90']}`}>0</span>
              </div>
              <div className={`${styles['text-wrapper_33']} flex-col`}>
                <span className={`${styles['text_91']}`}>0</span>
              </div>
              <div className={`${styles['text-wrapper_34']} flex-col`}>
                <span className={`${styles['text_92']}`}>2</span>
              </div>
              <div className={`${styles['text-wrapper_35']} flex-col`}>
                <span className={`${styles['text_93']}`}>3</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_36']} flex-col`}>
              <span className={`${styles['text_94']}`}>确认</span>
            </div>
            <div className={`${styles['text-wrapper_37']}`}>
              <span className={`${styles['text_95']}`}>没收到验证码？</span>
              <span className={`${styles['text_96']}`}>35S</span>
              <span className={`${styles['text_97']}`}></span>
              <span className={`${styles['text_98']}`}>重新发送</span>
            </div>
            <img
              className={`${styles['image_23']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['text-wrapper_38']} flex-col`}>
              <span className={`${styles['text_99']}`}>验证码错误，请输入正确验证码</span>
            </div>
          </div>
          <div className={`${styles['group_38']} flex-col`}>
            <div className={`${styles['box_27']} flex-row`}>
              <span className={`${styles['text_100']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_38']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_39']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_24']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['box_28']} flex-col`}>
              <div className={`${styles['group_39']} flex-row`}>
                <div className={`${styles['image-wrapper_14']} flex-col`}>
                  <img
                    className={`${styles['label_25']}`}
                    src={
                      require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                    }
                  />
                </div>
                <span className={`${styles['text_101']}`}>&nbsp;&nbsp;邮箱验证</span>
              </div>
            </div>
            <img
              className={`${styles['image_25']}`}
              src={
                require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
              }
            />
            <div className={`${styles['text-wrapper_39']}`}>
              <span className={`${styles['paragraph_5']}`}>
                验证码已发送到您的邮箱
                <br />
              </span>
              <span className={`${styles['text_102']}`}>599054675&#64;qq.com</span>
              <span className={`${styles['text_103']}`}>&nbsp;请输入验证码进行验证</span>
            </div>
            <div className={`${styles['box_29']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_40']} flex-col`}>
                <span className={`${styles['text_104']}`}>5</span>
              </div>
              <div className={`${styles['text-wrapper_41']} flex-col`}>
                <span className={`${styles['text_105']}`}>7</span>
              </div>
              <div className={`${styles['text-wrapper_42']} flex-col`}>
                <span className={`${styles['text_106']}`}>0</span>
              </div>
              <div className={`${styles['text-wrapper_43']} flex-col`}>
                <span className={`${styles['text_107']}`}>0</span>
              </div>
              <div className={`${styles['text-wrapper_44']} flex-col`}>
                <span className={`${styles['text_108']}`}>2</span>
              </div>
              <div className={`${styles['text-wrapper_45']} flex-col`}>
                <span className={`${styles['text_109']}`}>2</span>
              </div>
            </div>
            <div className={`${styles['box_30']} flex-col`}>
              <span className={`${styles['text_110']}`}>确认</span>
              <img
                className={`${styles['image_26']}`}
                src={
                  require('./assets/img/SketchPngc2a3413377bf61a05205b81f856a0435f59968f61776fb7e95ad7e666f2e3534.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_46']}`}>
              <span className={`${styles['text_111']}`}>没收到验证码？&nbsp;</span>
              <span className={`${styles['text_112']}`}>重新发送</span>
            </div>
            <img
              className={`${styles['image_27']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <span className={`${styles['text_113']}`}>邮箱验证通过</span>
          <div className={`${styles['group_40']} flex-col`}>
            <div className={`${styles['box_31']} flex-row`}>
              <span className={`${styles['text_114']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_40']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_41']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_28']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_32']} flex-row`}>
              <div className={`${styles['block_9']} flex-col`}>
                <div className={`${styles['image-wrapper_15']} flex-col`}>
                  <img
                    className={`${styles['label_26']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_115']}`}>示例</span>
              <div className={`${styles['block_10']} flex-row`}>
                <div className={`${styles['section_9']} flex-col`}>
                  <div className={`${styles['image-wrapper_16']} flex-col`}>
                    <img
                      className={`${styles['label_27']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_116']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['box_33']} flex-row`}>
              <span className={`${styles['text_117']}`}>昵称</span>
              <span className={`${styles['text_118']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_42']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_34']} flex-row`}>
              <span className={`${styles['text_119']}`}>邮箱</span>
              <span className={`${styles['text_120']}`}>599054675&#64;qq.com</span>
              <img
                className={`${styles['thumbnail_43']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_35']} flex-row justify-between`}>
              <span className={`${styles['text_121']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_44']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_47']} flex-col`}>
              <span className={`${styles['text_122']}`}>修改完成</span>
            </div>
            <div className={`${styles['text-wrapper_48']} flex-col`}>
              <span className={`${styles['text_123']}`}>注销账号</span>
            </div>
            <div className={`${styles['text-wrapper_49']} flex-col`}>
              <span className={`${styles['text_124']}`}>退出登录</span>
            </div>
            <img
              className={`${styles['image_29']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_30']}`}
            src={
              require('./assets/img/SketchPnga8334c42c08ba540dbd6d720d1367865f945821b8741aff14816d58859227c0a.png')
            }
          />
          <div className={`${styles['group_41']} flex-col`}>
            <div className={`${styles['box_36']} flex-row`}>
              <span className={`${styles['text_125']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_45']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_46']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_31']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_37']} flex-row`}>
              <div className={`${styles['section_10']} flex-col`}>
                <div className={`${styles['image-wrapper_17']} flex-col`}>
                  <img
                    className={`${styles['label_28']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_126']}`}>示例</span>
              <div className={`${styles['section_11']} flex-row`}>
                <div className={`${styles['block_11']} flex-col`}>
                  <div className={`${styles['image-wrapper_18']} flex-col`}>
                    <img
                      className={`${styles['label_29']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_127']}`}>修改密码</span>
              </div>
            </div>
            <img
              className={`${styles['image_32']}`}
              src={
                require('./assets/img/SketchPng36059e95dedfd624791a591e3c86d610cfb6da814cc0c7068b692969cf4b117c.png')
              }
            />
            <span className={`${styles['text_128']}`}>旧密码</span>
            <div className={`${styles['box_38']} flex-row`}>
              <img
                className={`${styles['label_30']}`}
                src={
                  require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                }
              />
              <span className={`${styles['text_129']}`}>请输入您现在的密码</span>
            </div>
            <div className={`${styles['text-wrapper_50']} flex-col`}>
              <span className={`${styles['text_130']}`}>下一步</span>
            </div>
            <img
              className={`${styles['image_33']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_34']}`}
            src={
              require('./assets/img/SketchPnga8334c42c08ba540dbd6d720d1367865f945821b8741aff14816d58859227c0a.png')
            }
          />
          <div className={`${styles['group_42']} flex-col`}>
            <div className={`${styles['box_39']} flex-col`}>
              <div className={`${styles['section_12']} flex-row`}>
                <span className={`${styles['text_131']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_47']}`}
                  src={
                    require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_48']}`}
                  src={
                    require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                  }
                />
                <img
                  className={`${styles['image_35']}`}
                  src={
                    require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                  }
                />
              </div>
              <div className={`${styles['section_13']} flex-col`}>
                <div className={`${styles['box_40']} flex-row`}>
                  <div className={`${styles['image-wrapper_19']} flex-col`}>
                    <img
                      className={`${styles['label_31']}`}
                      src={
                        require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text_132']}`}>修改密码</span>
                </div>
              </div>
              <img
                className={`${styles['image_36']}`}
                src={
                  require('./assets/img/SketchPng47e4cd1f751e318200768b0459bd36659b1cff7e660f19b8cbfa0f40f3107877.png')
                }
              />
              <span className={`${styles['text_133']}`}>设置新的密码</span>
              <div className={`${styles['section_14']} flex-row`}>
                <img
                  className={`${styles['label_32']}`}
                  src={
                    require('./assets/img/SketchPng4d13fd308481531fc141fb4256149d3acfc774600734363b59db40979e36151f.png')
                  }
                />
                <span className={`${styles['text_134']}`}>*******************</span>
              </div>
              <div className={`${styles['text-wrapper_51']} flex-col`}>
                <span className={`${styles['text_135']}`}>*******************</span>
              </div>
              <div className={`${styles['text-wrapper_52']} flex-col`}>
                <span className={`${styles['text_136']}`}>确定</span>
              </div>
              <img
                className={`${styles['image_37']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
          </div>
          <img
            className={`${styles['image_38']}`}
            src={
              require('./assets/img/SketchPnga8334c42c08ba540dbd6d720d1367865f945821b8741aff14816d58859227c0a.png')
            }
          />
          <div className={`${styles['group_43']} flex-col`}>
            <div className={`${styles['group_44']} flex-row`}>
              <span className={`${styles['text_137']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_49']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_50']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_39']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_45']} flex-row`}>
              <div className={`${styles['group_46']} flex-col`}>
                <div className={`${styles['image-wrapper_20']} flex-col`}>
                  <img
                    className={`${styles['label_33']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_138']}`}>示例</span>
              <div className={`${styles['group_47']} flex-row`}>
                <div className={`${styles['group_48']} flex-col`}>
                  <div className={`${styles['image-wrapper_21']} flex-col`}>
                    <img
                      className={`${styles['label_34']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_139']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['group_49']} flex-row`}>
              <span className={`${styles['text_140']}`}>昵称</span>
              <span className={`${styles['text_141']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_51']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_50']} flex-row`}>
              <span className={`${styles['text_142']}`}>邮箱</span>
              <span className={`${styles['text_143']}`}>599054675&#64;qq.com</span>
              <img
                className={`${styles['thumbnail_52']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_51']} flex-row justify-between`}>
              <span className={`${styles['text_144']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_53']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_53']} flex-col`}>
              <span className={`${styles['text_145']}`}>修改完成</span>
            </div>
            <div className={`${styles['text-wrapper_54']} flex-col`}>
              <span className={`${styles['text_146']}`}>注销账号</span>
            </div>
            <div className={`${styles['text-wrapper_55']} flex-col`}>
              <span className={`${styles['text_147']}`}>退出登录</span>
            </div>
            <img
              className={`${styles['image_40']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_41']}`}
            src={
              require('./assets/img/SketchPngf19ad852e268dbf8bd126ce229016278e73a90d8436219aacb9ed03909d0de0d.png')
            }
          />
          <div className={`${styles['group_52']} flex-col`}>
            <div className={`${styles['block_12']} flex-row`}>
              <span className={`${styles['text_148']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_54']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_55']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_42']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['block_13']} flex-row`}>
              <div className={`${styles['block_14']} flex-col`}>
                <div className={`${styles['image-wrapper_22']} flex-col`}>
                  <img
                    className={`${styles['label_35']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_149']}`}>示例</span>
              <div className={`${styles['block_15']} flex-row`}>
                <div className={`${styles['box_41']} flex-col`}>
                  <div className={`${styles['image-wrapper_23']} flex-col`}>
                    <img
                      className={`${styles['label_36']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_150']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['block_16']} flex-row`}>
              <span className={`${styles['text_151']}`}>昵称</span>
              <span className={`${styles['text_152']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_56']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['block_17']} flex-row`}>
              <span className={`${styles['text_153']}`}>邮箱</span>
              <span className={`${styles['text_154']}`}>599054675&#64;qq.com</span>
              <img
                className={`${styles['thumbnail_57']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['block_18']} flex-row justify-between`}>
              <span className={`${styles['text_155']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_58']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <img
              className={`${styles['image_43']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['block_19']} flex-col`}>
              <div className={`${styles['group_53']} flex-col`}>
                <div className={`${styles['text-wrapper_56']} flex-col`}>
                  <span className={`${styles['text_156']}`}>注销账号</span>
                </div>
                <div className={`${styles['group_54']} flex-col`}>
                  <div className={`${styles['box_42']} flex-row`}>
                    <img
                      className={`${styles['label_37']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text_157']}`}>请输入您的密码</span>
                    <img
                      className={`${styles['label_38']}`}
                      src={
                        require('./assets/img/SketchPng5a5bcceeaf7973f249a4527df64110b32a81be4004258961436cc0bd7a7633c4.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_55']} flex-col`} />
                <div className={`${styles['group_56']} flex-row`}>
                  <div className={`${styles['text-wrapper_57']} flex-col`}>
                    <span className={`${styles['text_158']}`}>取消</span>
                  </div>
                  <div className={`${styles['text-wrapper_58']} flex-col`}>
                    <span className={`${styles['text_159']}`}>确定</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_44']}`}
            src={
              require('./assets/img/SketchPngb3d1940746f48abccf33cb7ff85ed956281f9247c23c8fac61cdecfa3e9f33df.png')
            }
          />
          <div className={`${styles['group_57']} flex-col`}>
            <div className={`${styles['group_58']} flex-row`}>
              <span className={`${styles['text_160']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_59']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_60']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_45']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <img
              className={`${styles['image_46']}`}
              src={
                require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
              }
            />
            <div className={`${styles['text-wrapper_59']} flex-col`}>
              <span className={`${styles['text_161']}`}>登录</span>
            </div>
            <div className={`${styles['text-wrapper_60']} flex-col`}>
              <span className={`${styles['text_162']}`}>注册</span>
            </div>
            <div className={`${styles['image-wrapper_24']} flex-col`}>
              <img
                className={`${styles['image_47']}`}
                src={
                  require('./assets/img/SketchPng3bbee5b261b357b9db907a64a4c2d2fb3db03de095aaedb9cf0076349c5d8f8f.png')
                }
              />
            </div>
            <img
              className={`${styles['image_48']}`}
              src={
                require('./assets/img/SketchPng447747c2ae7540db66d1df310d771aa4420bce7d31d464bc481d56df7bad348a.png')
              }
            />
          </div>
          <div className={`${styles['group_59']} flex-col`}>
            <div className={`${styles['group_60']} flex-row`}>
              <span className={`${styles['text_163']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_61']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_62']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_49']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_61']} flex-row`}>
              <div className={`${styles['box_43']} flex-col`}>
                <div className={`${styles['image-wrapper_25']} flex-col`}>
                  <img
                    className={`${styles['label_39']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_164']}`}>示例</span>
              <div className={`${styles['box_44']} flex-row`}>
                <div className={`${styles['box_45']} flex-col`}>
                  <div className={`${styles['image-wrapper_26']} flex-col`}>
                    <img
                      className={`${styles['label_40']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_165']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['group_62']} flex-row`}>
              <span className={`${styles['text_166']}`}>昵称</span>
              <span className={`${styles['text_167']}`}>Antarctic&nbsp;Star</span>
              <img
                className={`${styles['thumbnail_63']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_63']} flex-row`}>
              <span className={`${styles['text_168']}`}>邮箱</span>
              <span className={`${styles['text_169']}`}>599054675&#64;qq.com</span>
              <img
                className={`${styles['thumbnail_64']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_64']} flex-row justify-between`}>
              <span className={`${styles['text_170']}`}>修改密码</span>
              <img
                className={`${styles['thumbnail_65']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_61']} flex-col`}>
              <span className={`${styles['text_171']}`}>注销账号</span>
            </div>
            <div className={`${styles['text-wrapper_62']} flex-col`}>
              <span className={`${styles['text_172']}`}>退出登录</span>
            </div>
            <img
              className={`${styles['image_50']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_65']} flex-col`}>
              <div className={`${styles['group_66']} flex-col justify-end`}>
                <span className={`${styles['text_173']}`}>退出登录</span>
                <span className={`${styles['text_174']}`}>确认退出此账号吗？</span>
                <div className={`${styles['block_20']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_63']} flex-col`}>
                    <span className={`${styles['text_175']}`}>取消</span>
                  </div>
                  <div className={`${styles['text-wrapper_64']} flex-col`}>
                    <span className={`${styles['text_176']}`}>退出</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_51']}`}
            src={
              require('./assets/img/SketchPng5a1e33a302635a96d3961ed2787113dc7809bb7148767fdd3970affbc46c4b98.png')
            }
          />
          <div className={`${styles['group_67']} flex-col`}>
            <div className={`${styles['section_15']} flex-row`}>
              <span className={`${styles['text_177']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_66']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_67']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_52']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <img
              className={`${styles['image_53']}`}
              src={
                require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
              }
            />
            <div className={`${styles['text-wrapper_65']} flex-col`}>
              <span className={`${styles['text_178']}`}>登录</span>
            </div>
            <div className={`${styles['text-wrapper_66']} flex-col`}>
              <span className={`${styles['text_179']}`}>注册</span>
            </div>
            <div className={`${styles['image-wrapper_27']} flex-col`}>
              <img
                className={`${styles['image_54']}`}
                src={
                  require('./assets/img/SketchPng3bbee5b261b357b9db907a64a4c2d2fb3db03de095aaedb9cf0076349c5d8f8f.png')
                }
              />
            </div>
          </div>
        </div>
        <div className={`${styles['section_16']} flex-row`}>
          <span className={`${styles['text_180']}`}>个人信息</span>
          <div className={`${styles['text-wrapper_67']} flex-col justify-between`}>
            <span className={`${styles['text_181']}`}>编辑昵称</span>
            <span className={`${styles['text_182']}`}>最多不能超过20个字符</span>
          </div>
          <span className={`${styles['text_183']}`}>修改邮箱</span>
          <div className={`${styles['text-wrapper_68']} flex-col justify-between`}>
            <span className={`${styles['text_184']}`}>邮箱验证</span>
            <span className={`${styles['text_185']}`}>发送中：加载动画显示</span>
          </div>
          <div className={`${styles['text-wrapper_69']} flex-col justify-between`}>
            <span className={`${styles['text_186']}`}>发送成功：tose提示（3s）</span>
            <span className={`${styles['text_187']}`}>倒计时60S后才能重新发送验证码</span>
          </div>
          <span className={`${styles['text_188']}`}>输入中：底部抽起数字键盘</span>
          <div className={`${styles['text-wrapper_70']} flex-col justify-between`}>
            <span className={`${styles['text_189']}`}>验证码错误（3s）</span>
            <span className={`${styles['paragraph_6']}`}>
              1、可重新输入验证码；
              <br />
              2、等倒计时结束重新发送后再输入新的验证码
            </span>
          </div>
          <div className={`${styles['text-wrapper_71']} flex-col justify-between`}>
            <span className={`${styles['text_190']}`}>修改邮箱成功</span>
            <span className={`${styles['text_191']}`}>返回个人信息页，tose提示“修改完成”（3s）</span>
          </div>
          <div className={`${styles['text-wrapper_72']} flex-col justify-between`}>
            <span className={`${styles['text_192']}`}>修改密码</span>
            <span className={`${styles['text_193']}`}>输入旧密码后才能激活下一步按钮</span>
          </div>
          <div className={`${styles['text-wrapper_73']} flex-col`}>
            <span className={`${styles['text_194']}`}>设置新密码</span>
            <span className={`${styles['text_195']}`}>密码：需满足8-12个字符，包括数字和英文</span>
            <span className={`${styles['text_196']}`}>两次密码必须输入一直才能激活确定按钮</span>
          </div>
          <div className={`${styles['text-wrapper_74']} flex-col justify-between`}>
            <span className={`${styles['text_197']}`}>修改密码成功</span>
            <span className={`${styles['text_198']}`}>返回个人信息页，tose提示“修改完成”（3s）</span>
          </div>
          <div className={`${styles['text-wrapper_75']} flex-col justify-between`}>
            <span className={`${styles['text_199']}`}>注销账号</span>
            <span className={`${styles['text_200']}`}>危险行为：需输入正确的密码</span>
          </div>
          <span className={`${styles['text_201']}`}>退出跳转至登录注册页</span>
          <div className={`${styles['text-wrapper_76']} flex-col justify-between`}>
            <span className={`${styles['text_202']}`}>退出账号</span>
            <span className={`${styles['text_203']}`}>危险行为：需二次确认弹窗</span>
          </div>
          <span className={`${styles['text_204']}`}>退出跳转至登录注册页</span>
        </div>
        <div className={`${styles['section_17']} flex-row`}>
          <div className={`${styles['block_21']} flex-col justify-between`}>
            <div className={`${styles['group_68']} flex-col`}>
              <div className={`${styles['section_18']} flex-col justify-between`}>
                <div className={`${styles['group_69']} flex-row`}>
                  <span className={`${styles['text_205']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_68']}`}
                    src={
                      require('./assets/img/SketchPng325d2fa1ece785fee4dc9ea589119c84874834835de860e1e928f7f1b13cda74.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_69']}`}
                    src={
                      require('./assets/img/SketchPng0285d8ecfbb0be2837579864402e9d18b2678f35cf8800fd65973ed603ebf378.png')
                    }
                  />
                  <img
                    className={`${styles['image_55']}`}
                    src={
                      require('./assets/img/SketchPng665f1ec0b8e58ed4df63f45b45cad40290d2b813adaee780227ea5c660b1d6d5.png')
                    }
                  />
                </div>
                <div className={`${styles['group_70']} flex-row`}>
                  <img
                    className={`${styles['image_56']}`}
                    src={
                      require('./assets/img/SketchPnge6fcad463d36720b441ae929a5c02665da1a6d1ddf3ab826195a070118f43bba.png')
                    }
                  />
                  <div className={`${styles['text-wrapper_77']} flex-col justify-between`}>
                    <span className={`${styles['text_206']}`}>jack</span>
                    <span className={`${styles['text_207']}`}>1***9&#64;gmail.com</span>
                  </div>
                  <img
                    className={`${styles['label_41']}`}
                    src={
                      require('./assets/img/SketchPngea1688bd6c2574d8de0f173f435c8ee15534e0d00d808446cc22a9064d674a8b.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['section_19']} flex-row`}>
                <img
                  className={`${styles['label_42']}`}
                  src={
                    require('./assets/img/SketchPng49f81c4d5fa9f8310ae4a79b16598b4f5491882a54735ab4d3c7fbfa3520d529.png')
                  }
                />
                <span className={`${styles['text_208']}`}>房间管理</span>
                <img
                  className={`${styles['thumbnail_70']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
                <img
                  className={`${styles['image_57']}`}
                  src={
                    require('./assets/img/SketchPngdd67a4c6747b5c1a659bc0eb43515556ef0185dc15cb2c5470a1ccce03947b28.png')
                  }
                />
              </div>
              <div className={`${styles['section_20']} flex-row`}>
                <img
                  className={`${styles['label_43']}`}
                  src={
                    require('./assets/img/SketchPng85fe7d07593fc1920a0b4d0cb45d6a8678d936c109017895b558657d3872895a.png')
                  }
                />
                <span className={`${styles['text_209']}`}>语言</span>
                <span className={`${styles['text_210']}`}>跟随系统</span>
                <img
                  className={`${styles['thumbnail_71']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_21']} flex-row`}>
                <img
                  className={`${styles['label_44']}`}
                  src={
                    require('./assets/img/SketchPng0ce7e0e23a249d8c85bd5936d6acff294b3c092ad601e809fc7e58d5c6f89a6b.png')
                  }
                />
                <span className={`${styles['text_211']}`}>关于</span>
                <img
                  className={`${styles['thumbnail_72']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_22']} flex-row`}>
                <img
                  className={`${styles['label_45']}`}
                  src={
                    require('./assets/img/SketchPng2726c51b44e2661210bc26a58c09d2f355e3e6dc01d2b334a97d698c4509b656.png')
                  }
                />
                <span className={`${styles['text_212']}`}>联系我们</span>
                <img
                  className={`${styles['thumbnail_73']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_23']} flex-row`}>
                <img
                  className={`${styles['label_46']}`}
                  src={
                    require('./assets/img/SketchPngc09d7eb9e329efe160bb010857c9110bada73491f2442a7029a889dfed178acf.png')
                  }
                />
                <span className={`${styles['text_213']}`}>问题反馈</span>
                <img
                  className={`${styles['thumbnail_74']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_24']} flex-row`}>
                <img
                  className={`${styles['label_47']}`}
                  src={
                    require('./assets/img/SketchPngf0c619e1b1ff390962ac7c1ce212c09b1ac87b8e8a536237648fb57a81104512.png')
                  }
                />
                <span className={`${styles['text_214']}`}>访问官网</span>
                <img
                  className={`${styles['thumbnail_75']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_25']} flex-row`}>
                <img
                  className={`${styles['label_48']}`}
                  src={
                    require('./assets/img/SketchPng0ee4c51237f5ce9060686a9b7808226fb7a85b5fccaf358f70b3f49117ce9e13.png')
                  }
                />
                <span className={`${styles['text_215']}`}>产品说明书</span>
                <img
                  className={`${styles['thumbnail_76']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_26']} flex-row`}>
                <img
                  className={`${styles['label_49']}`}
                  src={
                    require('./assets/img/SketchPng2c188398301d87a25347eb573cc7ec8a6f5fcb8004e5da4ab39c7fc6a89d227c.png')
                  }
                />
                <span className={`${styles['text_216']}`}>常见问题</span>
                <img
                  className={`${styles['thumbnail_77']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['section_27']} flex-col`}>
                <div className={`${styles['block_22']} flex-row`}>
                  <div className={`${styles['image-text_1']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_50']}`}
                      src={
                        require('./assets/img/SketchPng6474be6d59434eb9665cd87383de0156e2aa3437fe119c6f4285372db3a1c22b.png')
                      }
                    />
                    <span className={`${styles['text-group_1']}`}>语音控制</span>
                  </div>
                </div>
                <div className={`${styles['block_23']} flex-row justify-between`}>
                  <div className={`${styles['section_28']} flex-row`}>
                    <div className={`${styles['image-text_2']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_78']}`}
                        src={
                          require('./assets/img/SketchPng7b5aa43899614644b92020e77846ebc6f18615a252d39bc3b2f787424bfbd36a.png')
                        }
                      />
                      <span className={`${styles['text-group_2']}`}>Alexa</span>
                    </div>
                  </div>
                  <div className={`${styles['section_29']} flex-row`}>
                    <div className={`${styles['image-text_3']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_79']}`}
                        src={
                          require('./assets/img/SketchPngb0313c7261831ab6863853011dfb1ec771bf6efaa44c2cc2f7af7841d929f922.png')
                        }
                      />
                      <span className={`${styles['text-group_3']}`}>Google&nbsp;Assi…</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['section_30']} flex-col justify-between`}>
                <div className={`${styles['group_71']} flex-row`}>
                  <img
                    className={`${styles['label_51']}`}
                    src={
                      require('./assets/img/SketchPng48a9f50f5e4d8344972048129c54511b85c43757f84f55d14177b59591e46ba6.png')
                    }
                  />
                  <div className={`${styles['block_24']} flex-col`} />
                  <img
                    className={`${styles['label_52']}`}
                    src={
                      require('./assets/img/SketchPng866cc62927075fa19b5d2d39a517aca7b82c2a03d2ddc26c5e1f7c8819270473.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_58']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['image-wrapper_28']} flex-col`}>
                <img
                  className={`${styles['thumbnail_80']}`}
                  src={
                    require('./assets/img/SketchPng633c60adbae3a8a8f02dbc076d49708f1cdf17ff1a3df1e544363c0ef825b701.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['text-group_4']} flex-col justify-between`}>
              <span className={`${styles['text_217']}`}>我的</span>
              <span className={`${styles['text_218']}`}>1、邮箱地址加密处理</span>
            </div>
          </div>
          <div className={`${styles['block_25']} flex-col`}>
            <div className={`${styles['section_31']} flex-col`}>
              <div className={`${styles['box_46']} flex-row`}>
                <span className={`${styles['text_219']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_81']}`}
                  src={
                    require('./assets/img/SketchPng515c297a962a9362d15b73f794de6b9bcc10e2937d152d06615ca8e2335dd8e4.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_82']}`}
                  src={
                    require('./assets/img/SketchPng81fdd6f7277450185e0a172ca32db6fd7a6571cd607a17f5cf402f2b72fe55fb.png')
                  }
                />
                <img
                  className={`${styles['image_59']}`}
                  src={
                    require('./assets/img/SketchPngf185db1ee3d8081f83697d5c73747194197f13e54cdd32f0dbe245f1cd035938.png')
                  }
                />
              </div>
              <div className={`${styles['box_47']} flex-row`}>
                <div className={`${styles['section_32']} flex-col`}>
                  <div className={`${styles['image-wrapper_29']} flex-col`}>
                    <img
                      className={`${styles['label_53']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_220']}`}>示例</span>
                <div className={`${styles['section_33']} flex-row`}>
                  <div className={`${styles['section_34']} flex-col`}>
                    <div className={`${styles['image-wrapper_30']} flex-col`}>
                      <img
                        className={`${styles['label_54']}`}
                        src={
                          require('./assets/img/SketchPng41d1e98824f4b83981d0f104d1ee23379532a3aa550c7bd0d8c99149de7f1e61.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_221']}`}>房间管理</span>
                  <span className={`${styles['text_222']}`}>编辑</span>
                  <img
                    className={`${styles['image_60']}`}
                    src={
                      require('./assets/img/SketchPngd8ef95ea0051a113b5cc47809b0716bf2ed7f67e14ba6c6abbe1b865bc06e589.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_48']} flex-row`}>
                <span className={`${styles['text_223']}`}>客厅</span>
                <span className={`${styles['text_224']}`}>2个设备</span>
                <img
                  className={`${styles['label_55']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <div className={`${styles['image-wrapper_31']} flex-col`}>
                  <img
                    className={`${styles['image_61']}`}
                    src={
                      require('./assets/img/SketchPng6b50972c20bb15182bfdd7c1b7d93defaf9ad4f81558e445cad7299e8a0fc13b.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_49']} flex-row`}>
                <div className={`${styles['group_72']} flex-col`}>
                  <div className={`${styles['image-wrapper_32']} flex-col`}>
                    <img
                      className={`${styles['image_62']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_56']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_225']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['box_50']} flex-row`}>
                <div className={`${styles['group_73']} flex-col`}>
                  <div className={`${styles['image-wrapper_33']} flex-col`}>
                    <img
                      className={`${styles['image_63']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_57']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_226']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['box_51']} flex-row`}>
                <span className={`${styles['text_227']}`}>主卧</span>
                <span className={`${styles['text_228']}`}>0个设备</span>
                <img
                  className={`${styles['label_58']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_83']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_52']} flex-row`}>
                <span className={`${styles['text_229']}`}>次卧</span>
                <span className={`${styles['text_230']}`}>0个设备</span>
                <img
                  className={`${styles['label_59']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_84']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_53']} flex-row`}>
                <span className={`${styles['text_231']}`}>厨房</span>
                <span className={`${styles['text_232']}`}>0个设备</span>
                <img
                  className={`${styles['label_60']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_85']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_54']} flex-row`}>
                <span className={`${styles['text_233']}`}>分享给我</span>
                <span className={`${styles['text_234']}`}>1个设备</span>
                <img
                  className={`${styles['label_61']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_86']}`}
                  src={
                    require('./assets/img/SketchPng7f09959836a2310ceafbf0bfaf6bffc9f03b398a4eefebb4d6db1a9d7e8a950f.png')
                  }
                />
              </div>
              <div className={`${styles['box_55']} flex-row`}>
                <div className={`${styles['group_74']} flex-col`}>
                  <div className={`${styles['image-wrapper_34']} flex-col`}>
                    <img
                      className={`${styles['image_64']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_62']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_235']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['text-wrapper_78']} flex-col`}>
                <span className={`${styles['text_236']}`}>添加房间</span>
              </div>
              <img
                className={`${styles['image_65']}`}
                src={
                  require('./assets/img/SketchPng87d62995fad6a987b3ed54aeb88e7dc8168192760fbabefd1bca58d3e9aaa303.png')
                }
              />
            </div>
            <span className={`${styles['text_237']}`}>房间管理</span>
            <span className={`${styles['paragraph_7']}`}>
              1、可编辑房间名称
              <br />
              2、可添展开收起房间设备（默认展开有设备的房间）
              <br />
              3、可添加房间
              <br />
              4、可编辑
            </span>
          </div>
          <div className={`${styles['block_26']} flex-col`}>
            <div className={`${styles['box_56']} flex-col`}>
              <div className={`${styles['group_75']} flex-row`}>
                <span className={`${styles['text_238']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_87']}`}
                  src={
                    require('./assets/img/SketchPng2354ea9fbe04d1446b9da3ec3b1f7864d03a96210a6fa67497cff47c915d3f86.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_88']}`}
                  src={
                    require('./assets/img/SketchPng482ac6cc419a95f3cfc5daf3bdc5d377d03b19605205a2323efdb3499baae623.png')
                  }
                />
                <img
                  className={`${styles['image_66']}`}
                  src={
                    require('./assets/img/SketchPng61982e28040d7e0584193a0c7cd86653dc8da166c5a911f6e2f685d00662bcbc.png')
                  }
                />
              </div>
              <div className={`${styles['group_76']} flex-row`}>
                <div className={`${styles['group_77']} flex-col`}>
                  <div className={`${styles['image-wrapper_35']} flex-col`}>
                    <img
                      className={`${styles['label_63']}`}
                      src={
                        require('./assets/img/SketchPng39e155d8d0d7698d4d956712ab51a8e91ba31a5ace2b569199af8a1ffc5d65d9.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_239']}`}>示例</span>
                <div className={`${styles['group_78']} flex-row`}>
                  <div className={`${styles['box_57']} flex-col`}>
                    <div className={`${styles['image-wrapper_36']} flex-col`}>
                      <img
                        className={`${styles['label_64']}`}
                        src={
                          require('./assets/img/SketchPnga24a0f586a547b508feee0f5ab1d3d287a3a050b4b3f89892ada098266de49ca.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_240']}`}>房间管理</span>
                  <span className={`${styles['text_241']}`}>编辑</span>
                </div>
              </div>
              <div className={`${styles['group_79']} flex-row`}>
                <span className={`${styles['text_242']}`}>客厅</span>
                <span className={`${styles['text_243']}`}>2个设备</span>
                <img
                  className={`${styles['label_65']}`}
                  src={
                    require('./assets/img/SketchPng32851ebd025897fdeece5f3a235e9c5f35eaf889ee4a3477f1d517500ecd7136.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_89']}`}
                  src={
                    require('./assets/img/SketchPng35e0e7cde45973837f500a4ed010dc71c6ed8ddc2d5f1101e7fb588fd5c5f592.png')
                  }
                />
              </div>
              <div className={`${styles['group_80']} flex-row`}>
                <div className={`${styles['block_27']} flex-col`}>
                  <div className={`${styles['image-wrapper_37']} flex-col`}>
                    <img
                      className={`${styles['image_67']}`}
                      src={
                        require('./assets/img/SketchPng3377ea9cd1715ea3e9f671aa9c5935fd7c50bd0fb2363e6903daaa3cd118d138.png')
                      }
                    />
                    <img
                      className={`${styles['label_66']}`}
                      src={
                        require('./assets/img/SketchPnga2bd1c4571decb92425632d77f201338ea4c5a28227449174f733bf397346f65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_244']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['group_81']} flex-row`}>
                <div className={`${styles['block_28']} flex-col`}>
                  <div className={`${styles['image-wrapper_38']} flex-col`}>
                    <img
                      className={`${styles['image_68']}`}
                      src={
                        require('./assets/img/SketchPng3377ea9cd1715ea3e9f671aa9c5935fd7c50bd0fb2363e6903daaa3cd118d138.png')
                      }
                    />
                    <img
                      className={`${styles['label_67']}`}
                      src={
                        require('./assets/img/SketchPnga2bd1c4571decb92425632d77f201338ea4c5a28227449174f733bf397346f65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_245']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['group_82']} flex-row`}>
                <span className={`${styles['text_246']}`}>主卧</span>
                <span className={`${styles['text_247']}`}>0个设备</span>
                <img
                  className={`${styles['label_68']}`}
                  src={
                    require('./assets/img/SketchPng32851ebd025897fdeece5f3a235e9c5f35eaf889ee4a3477f1d517500ecd7136.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_90']}`}
                  src={
                    require('./assets/img/SketchPng19e3928ae2ec2a0d6574c6b21bef22f5a342c0a879eca4ecb6d7f6e422c66748.png')
                  }
                />
              </div>
              <div className={`${styles['group_83']} flex-row`}>
                <span className={`${styles['text_248']}`}>次卧</span>
                <span className={`${styles['text_249']}`}>0个设备</span>
                <img
                  className={`${styles['label_69']}`}
                  src={
                    require('./assets/img/SketchPng32851ebd025897fdeece5f3a235e9c5f35eaf889ee4a3477f1d517500ecd7136.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_91']}`}
                  src={
                    require('./assets/img/SketchPng19e3928ae2ec2a0d6574c6b21bef22f5a342c0a879eca4ecb6d7f6e422c66748.png')
                  }
                />
              </div>
              <img
                className={`${styles['image_69']}`}
                src={
                  require('./assets/img/SketchPng4fe57ca8e85044f884af353deddc96bccc9a4705dc10a9d61aaf11664f567f6b.png')
                }
              />
              <div className={`${styles['group_84']} flex-col`}>
                <div className={`${styles['block_29']} flex-col`}>
                  <div className={`${styles['text-wrapper_79']} flex-col`}>
                    <span className={`${styles['text_250']}`}>房间名称</span>
                  </div>
                  <div className={`${styles['text-wrapper_80']} flex-col`}>
                    <span className={`${styles['text_251']}`}>请输入房间名称</span>
                  </div>
                  <div className={`${styles['box_58']} flex-col`} />
                  <div className={`${styles['box_59']} flex-row`}>
                    <div className={`${styles['text-wrapper_81']} flex-col`}>
                      <span className={`${styles['text_252']}`}>取消</span>
                    </div>
                    <div className={`${styles['text-wrapper_82']} flex-col`}>
                      <span className={`${styles['text_253']}`}>确定</span>
                    </div>
                  </div>
                </div>
                <img
                  className={`${styles['image_70']}`}
                  src={
                    require('./assets/img/SketchPng1f010d4e4d809e18c332bbf00f381acb3e7b5b99702c9861c5fcb931bd3e2d7d.png')
                  }
                />
              </div>
            </div>
            <span className={`${styles['text_254']}`}>编辑房间名称</span>
            <span className={`${styles['text_255']}`}>1、房间名称不能超过&nbsp;20&nbsp;个字符；</span>
          </div>
          <div className={`${styles['block_30']} flex-col`}>
            <div className={`${styles['group_85']} flex-row`}>
              <div className={`${styles['group_86']} flex-col`}>
                <div className={`${styles['group_87']} flex-row`}>
                  <span className={`${styles['text_256']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_92']}`}
                    src={
                      require('./assets/img/SketchPng515c297a962a9362d15b73f794de6b9bcc10e2937d152d06615ca8e2335dd8e4.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_93']}`}
                    src={
                      require('./assets/img/SketchPng81fdd6f7277450185e0a172ca32db6fd7a6571cd607a17f5cf402f2b72fe55fb.png')
                    }
                  />
                  <img
                    className={`${styles['image_71']}`}
                    src={
                      require('./assets/img/SketchPngf185db1ee3d8081f83697d5c73747194197f13e54cdd32f0dbe245f1cd035938.png')
                    }
                  />
                </div>
                <div className={`${styles['group_88']} flex-row`}>
                  <div className={`${styles['group_89']} flex-col`}>
                    <div className={`${styles['image-wrapper_39']} flex-col`}>
                      <img
                        className={`${styles['label_70']}`}
                        src={
                          require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_257']}`}>示例</span>
                  <div className={`${styles['group_90']} flex-row`}>
                    <div className={`${styles['group_91']} flex-col`} />
                    <span className={`${styles['text_258']}`}>取消</span>
                    <span className={`${styles['text_259']}`}>房间管理</span>
                    <span className={`${styles['text_260']}`}>完成</span>
                  </div>
                </div>
                <div className={`${styles['group_92']} flex-row`}>
                  <img
                    className={`${styles['label_71']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_261']}`}>客厅</span>
                  <span className={`${styles['text_262']}`}>2个设备</span>
                  <img
                    className={`${styles['thumbnail_94']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['group_93']} flex-row`}>
                  <div className={`${styles['box_60']} flex-col`}>
                    <div className={`${styles['image-wrapper_40']} flex-col`}>
                      <img
                        className={`${styles['image_72']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_72']}`}
                        src={
                          require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_263']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_95']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['group_94']} flex-row`}>
                  <div className={`${styles['box_61']} flex-col`}>
                    <div className={`${styles['image-wrapper_41']} flex-col`}>
                      <img
                        className={`${styles['image_73']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_73']}`}
                        src={
                          require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_264']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_96']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                  <div className={`${styles['box_62']} flex-col`}>
                    <div className={`${styles['group_95']} flex-row`}>
                      <div className={`${styles['section_35']} flex-col`}>
                        <div className={`${styles['image-wrapper_42']} flex-col`}>
                          <img
                            className={`${styles['image_74']}`}
                            src={
                              require('./assets/img/SketchPng5e408e9b0ed6b756caf9e58870f34509f86c0e747c24041f1bc9cb83d535706b.png')
                            }
                          />
                          <img
                            className={`${styles['label_74']}`}
                            src={
                              require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                            }
                          />
                        </div>
                      </div>
                      <span className={`${styles['text_265']}`}>Air&nbsp;Conditioner</span>
                      <img
                        className={`${styles['thumbnail_97']}`}
                        src={
                          require('./assets/img/SketchPnga06dfdb0a85c91303eaf400863304c8f1612312c7fdc087e8fb96f7b2cac2e80.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_98']}`}
                        src={
                          require('./assets/img/SketchPngf172e62084c5f2ca6756a4143e62c6c4c35d267627647caca19432757b8b22c6.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_96']} flex-row`}>
                  <img
                    className={`${styles['label_75']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_266']}`}>主卧</span>
                  <span className={`${styles['text_267']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_99']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['group_97']} flex-row`}>
                  <img
                    className={`${styles['label_76']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_268']}`}>次卧</span>
                  <span className={`${styles['text_269']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_100']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['group_98']} flex-row`}>
                  <img
                    className={`${styles['label_77']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_270']}`}>厨房</span>
                  <span className={`${styles['text_271']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_101']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['group_99']} flex-row`}>
                  <img
                    className={`${styles['label_78']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_272']}`}>分享给我</span>
                  <span className={`${styles['text_273']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_102']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['group_100']} flex-col`} />
                <img
                  className={`${styles['image_75']}`}
                  src={
                    require('./assets/img/SketchPng87d62995fad6a987b3ed54aeb88e7dc8168192760fbabefd1bca58d3e9aaa303.png')
                  }
                />
                <div className={`${styles['group_101']} flex-col`} />
              </div>
              <img
                className={`${styles['label_79']}`}
                src={
                  require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                }
              />
              <div className={`${styles['group_102']} flex-col`}>
                <div className={`${styles['box_63']} flex-row`}>
                  <span className={`${styles['text_274']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_103']}`}
                    src={
                      require('./assets/img/SketchPng78faed2222fd5c7ad8f274b7447504314e21499ba83fc9f72e0231a8e2d997c3.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_104']}`}
                    src={
                      require('./assets/img/SketchPng36fe3df3524618c20b49e8de5c3ea8f8067ff8028dea0850f52042cc13b3feb8.png')
                    }
                  />
                  <img
                    className={`${styles['image_76']}`}
                    src={
                      require('./assets/img/SketchPng519c3a3329f992be63e0ecae3d9fb8364bdf3a26a0461a82091520b0b34c30ad.png')
                    }
                  />
                </div>
                <div className={`${styles['box_64']} flex-row`}>
                  <div className={`${styles['group_103']} flex-col`}>
                    <div className={`${styles['image-wrapper_43']} flex-col`}>
                      <img
                        className={`${styles['label_80']}`}
                        src={
                          require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_275']}`}>示例</span>
                  <div className={`${styles['group_104']} flex-row`}>
                    <div className={`${styles['box_65']} flex-col`} />
                    <span className={`${styles['text_276']}`}>取消</span>
                    <span className={`${styles['text_277']}`}>房间管理</span>
                    <span className={`${styles['text_278']}`}>完成</span>
                  </div>
                </div>
                <div className={`${styles['box_66']} flex-row`}>
                  <img
                    className={`${styles['label_81']}`}
                    src={
                      require('./assets/img/SketchPng2a45719ac6295403d4ed7633aa658a728bb301fbf062e7fc23a80e98f457284a.png')
                    }
                  />
                  <span className={`${styles['text_279']}`}>客厅</span>
                  <span className={`${styles['text_280']}`}>3个设备</span>
                  <img
                    className={`${styles['thumbnail_105']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <div className={`${styles['box_67']} flex-row`}>
                  <div className={`${styles['group_105']} flex-col`}>
                    <div className={`${styles['image-wrapper_44']} flex-col`}>
                      <img
                        className={`${styles['image_77']}`}
                        src={
                          require('./assets/img/SketchPng7af9bfad0806ef6c118dc719be5364aeafa8fb09aa0f3a7733e110b736d184cd.png')
                        }
                      />
                      <img
                        className={`${styles['label_82']}`}
                        src={
                          require('./assets/img/SketchPng7f7d0f64c5daf5ae61631a8351b604b0ebb03f36f6e24ef48dda84fd79c465f9.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_281']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_106']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <div className={`${styles['box_68']} flex-row`}>
                  <div className={`${styles['box_69']} flex-col`}>
                    <div className={`${styles['image-wrapper_45']} flex-col`}>
                      <img
                        className={`${styles['image_78']}`}
                        src={
                          require('./assets/img/SketchPng7af9bfad0806ef6c118dc719be5364aeafa8fb09aa0f3a7733e110b736d184cd.png')
                        }
                      />
                      <img
                        className={`${styles['label_83']}`}
                        src={
                          require('./assets/img/SketchPng7f7d0f64c5daf5ae61631a8351b604b0ebb03f36f6e24ef48dda84fd79c465f9.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_282']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_107']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <div className={`${styles['box_70']} flex-row`}>
                  <div className={`${styles['group_106']} flex-col`}>
                    <div className={`${styles['image-wrapper_46']} flex-col`}>
                      <img
                        className={`${styles['image_79']}`}
                        src={
                          require('./assets/img/SketchPng7af9bfad0806ef6c118dc719be5364aeafa8fb09aa0f3a7733e110b736d184cd.png')
                        }
                      />
                      <img
                        className={`${styles['label_84']}`}
                        src={
                          require('./assets/img/SketchPng7f7d0f64c5daf5ae61631a8351b604b0ebb03f36f6e24ef48dda84fd79c465f9.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_283']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_108']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <div className={`${styles['box_71']} flex-row justify-between`}>
                  <div className={`${styles['group_107']} flex-row`}>
                    <span className={`${styles['text_284']}`}>0个设备</span>
                    <img
                      className={`${styles['thumbnail_109']}`}
                      src={
                        require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_108']} flex-col`}>
                    <span className={`${styles['text_285']}`}>删除</span>
                    <img
                      className={`${styles['image_80']}`}
                      src={
                        require('./assets/img/SketchPng1244c00f61774047bd008f99abeecda9588ab9dbf7aae52b782e1605d6c33ecc.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['box_72']} flex-row`}>
                  <img
                    className={`${styles['label_85']}`}
                    src={
                      require('./assets/img/SketchPng2a45719ac6295403d4ed7633aa658a728bb301fbf062e7fc23a80e98f457284a.png')
                    }
                  />
                  <span className={`${styles['text_286']}`}>次卧</span>
                  <span className={`${styles['text_287']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_110']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <div className={`${styles['box_73']} flex-row`}>
                  <img
                    className={`${styles['label_86']}`}
                    src={
                      require('./assets/img/SketchPng2a45719ac6295403d4ed7633aa658a728bb301fbf062e7fc23a80e98f457284a.png')
                    }
                  />
                  <span className={`${styles['text_288']}`}>厨房</span>
                  <span className={`${styles['text_289']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_111']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <div className={`${styles['box_74']} flex-row`}>
                  <img
                    className={`${styles['label_87']}`}
                    src={
                      require('./assets/img/SketchPng2a45719ac6295403d4ed7633aa658a728bb301fbf062e7fc23a80e98f457284a.png')
                    }
                  />
                  <span className={`${styles['text_290']}`}>分享给我</span>
                  <span className={`${styles['text_291']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_112']}`}
                    src={
                      require('./assets/img/SketchPng0b091616f223de7acc2c3a09ee9661b0b7c4a8c65023fdb4a49fa3bc23fd3bd6.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_81']}`}
                  src={
                    require('./assets/img/SketchPng0815ee4418cf2022488cf609a116f0884fe231f062df65696ca78608a918df8d.png')
                  }
                />
                <img
                  className={`${styles['image_82']}`}
                  src={
                    require('./assets/img/SketchPngfcca6a21a34cf15b575cbfc9b3c02a473fc178cb1bd5624872e3b1bdecdcd949.png')
                  }
                />
              </div>
              <span className={`${styles['text_292']}`}>主卧</span>
            </div>
            <span className={`${styles['text_293']}`}>编辑房间</span>
            <span className={`${styles['paragraph_8']}`}>
              1、默认展开所有设备；
              <br />
              2、可按右侧图标上下拖拽房间组或
              <br />
              单个设备上下调整排序；
              <br />
              3、可点击左侧删除图标，左划卡片再点击删除房；
            </span>
          </div>
          <div className={`${styles['block_31']} flex-col`}>
            <div className={`${styles['group_109']} flex-row justify-between`}>
              <div className={`${styles['box_75']} flex-col`}>
                <div className={`${styles['section_36']} flex-row`}>
                  <span className={`${styles['text_294']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_113']}`}
                    src={
                      require('./assets/img/SketchPng515c297a962a9362d15b73f794de6b9bcc10e2937d152d06615ca8e2335dd8e4.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_114']}`}
                    src={
                      require('./assets/img/SketchPng81fdd6f7277450185e0a172ca32db6fd7a6571cd607a17f5cf402f2b72fe55fb.png')
                    }
                  />
                  <img
                    className={`${styles['image_83']}`}
                    src={
                      require('./assets/img/SketchPngf185db1ee3d8081f83697d5c73747194197f13e54cdd32f0dbe245f1cd035938.png')
                    }
                  />
                </div>
                <div className={`${styles['section_37']} flex-row`}>
                  <div className={`${styles['section_38']} flex-col`}>
                    <div className={`${styles['image-wrapper_47']} flex-col`}>
                      <img
                        className={`${styles['label_88']}`}
                        src={
                          require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_295']}`}>示例</span>
                  <div className={`${styles['section_39']} flex-row`}>
                    <div className={`${styles['box_76']} flex-col`} />
                    <span className={`${styles['text_296']}`}>取消</span>
                    <span className={`${styles['text_297']}`}>房间管理</span>
                    <span className={`${styles['text_298']}`}>完成</span>
                    <img
                      className={`${styles['image_84']}`}
                      src={
                        require('./assets/img/SketchPng1244c00f61774047bd008f99abeecda9588ab9dbf7aae52b782e1605d6c33ecc.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['section_40']} flex-row`}>
                  <img
                    className={`${styles['label_89']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_299']}`}>客厅</span>
                  <span className={`${styles['text_300']}`}>3个设备</span>
                  <img
                    className={`${styles['thumbnail_115']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['section_41']} flex-row`}>
                  <div className={`${styles['section_42']} flex-col`}>
                    <div className={`${styles['image-wrapper_48']} flex-col`}>
                      <img
                        className={`${styles['image_85']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_90']}`}
                        src={
                          require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_301']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_116']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['section_43']} flex-row`}>
                  <div className={`${styles['box_77']} flex-col`}>
                    <div className={`${styles['image-wrapper_49']} flex-col`}>
                      <img
                        className={`${styles['image_86']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_91']}`}
                        src={
                          require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_302']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_117']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['section_44']} flex-row`}>
                  <div className={`${styles['group_110']} flex-col`}>
                    <div className={`${styles['image-wrapper_50']} flex-col`}>
                      <img
                        className={`${styles['image_87']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_92']}`}
                        src={
                          require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_303']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_118']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['section_45']} flex-row`}>
                  <img
                    className={`${styles['label_93']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_304']}`}>次卧</span>
                  <span className={`${styles['text_305']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_119']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['section_46']} flex-row`}>
                  <img
                    className={`${styles['label_94']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_306']}`}>厨房</span>
                  <span className={`${styles['text_307']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_120']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <div className={`${styles['section_47']} flex-row`}>
                  <img
                    className={`${styles['label_95']}`}
                    src={
                      require('./assets/img/SketchPng728dcf6f02016b2d3388b527418e4617d1d339ff84b0aac2b203317512b6dcd0.png')
                    }
                  />
                  <span className={`${styles['text_308']}`}>分享给我</span>
                  <span className={`${styles['text_309']}`}>0个设备</span>
                  <img
                    className={`${styles['thumbnail_121']}`}
                    src={
                      require('./assets/img/SketchPng0914f7c92d53e5d98e6435cd6605b4dd605b678cced17b7aa776ce163025c145.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_88']}`}
                  src={
                    require('./assets/img/SketchPng87d62995fad6a987b3ed54aeb88e7dc8168192760fbabefd1bca58d3e9aaa303.png')
                  }
                />
                <div className={`${styles['text-wrapper_83']} flex-col`}>
                  <span className={`${styles['text_310']}`}>删除成功</span>
                </div>
              </div>
              <span className={`${styles['text_311']}`}>保存</span>
            </div>
            <span className={`${styles['text_312']}`}>删除成功</span>
            <span className={`${styles['paragraph_9']}`}>
              删除后出现tose“删除成功”提醒（3s）
              <br />
              该删除的房间从列表消失，
              <br />
              下面的卡片往上对齐
            </span>
          </div>
          <div className={`${styles['block_32']} flex-col`}>
            <div className={`${styles['box_78']} flex-col`}>
              <div className={`${styles['box_79']} flex-row`}>
                <span className={`${styles['text_313']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_122']}`}
                  src={
                    require('./assets/img/SketchPng515c297a962a9362d15b73f794de6b9bcc10e2937d152d06615ca8e2335dd8e4.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_123']}`}
                  src={
                    require('./assets/img/SketchPng81fdd6f7277450185e0a172ca32db6fd7a6571cd607a17f5cf402f2b72fe55fb.png')
                  }
                />
                <img
                  className={`${styles['image_89']}`}
                  src={
                    require('./assets/img/SketchPngf185db1ee3d8081f83697d5c73747194197f13e54cdd32f0dbe245f1cd035938.png')
                  }
                />
              </div>
              <div className={`${styles['box_80']} flex-row`}>
                <div className={`${styles['box_81']} flex-col`}>
                  <div className={`${styles['image-wrapper_51']} flex-col`}>
                    <img
                      className={`${styles['label_96']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_314']}`}>示例</span>
                <div className={`${styles['box_82']} flex-row`}>
                  <div className={`${styles['block_33']} flex-col`}>
                    <div className={`${styles['image-wrapper_52']} flex-col`}>
                      <img
                        className={`${styles['label_97']}`}
                        src={
                          require('./assets/img/SketchPng41d1e98824f4b83981d0f104d1ee23379532a3aa550c7bd0d8c99149de7f1e61.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_315']}`}>房间管理</span>
                  <span className={`${styles['text_316']}`}>编辑</span>
                </div>
              </div>
              <div className={`${styles['box_83']} flex-row`}>
                <span className={`${styles['text_317']}`}>客厅</span>
                <span className={`${styles['text_318']}`}>3个设备</span>
                <img
                  className={`${styles['label_98']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_124']}`}
                  src={
                    require('./assets/img/SketchPng7f09959836a2310ceafbf0bfaf6bffc9f03b398a4eefebb4d6db1a9d7e8a950f.png')
                  }
                />
              </div>
              <div className={`${styles['box_84']} flex-row`}>
                <div className={`${styles['group_111']} flex-col`}>
                  <div className={`${styles['image-wrapper_53']} flex-col`}>
                    <img
                      className={`${styles['image_90']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_99']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_319']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['box_85']} flex-row`}>
                <div className={`${styles['group_112']} flex-col`}>
                  <div className={`${styles['image-wrapper_54']} flex-col`}>
                    <img
                      className={`${styles['image_91']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_100']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_320']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['box_86']} flex-row`}>
                <div className={`${styles['block_34']} flex-col`}>
                  <div className={`${styles['image-wrapper_55']} flex-col`}>
                    <img
                      className={`${styles['image_92']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_101']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_321']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['box_87']} flex-row`}>
                <span className={`${styles['text_322']}`}>次卧</span>
                <span className={`${styles['text_323']}`}>0个设备</span>
                <img
                  className={`${styles['label_102']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_125']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_88']} flex-row`}>
                <span className={`${styles['text_324']}`}>厨房</span>
                <span className={`${styles['text_325']}`}>0个设备</span>
                <img
                  className={`${styles['label_103']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_126']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_89']} flex-row`}>
                <span className={`${styles['text_326']}`}>分享给我</span>
                <span className={`${styles['text_327']}`}>1个设备</span>
                <img
                  className={`${styles['label_104']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_127']}`}
                  src={
                    require('./assets/img/SketchPng7f09959836a2310ceafbf0bfaf6bffc9f03b398a4eefebb4d6db1a9d7e8a950f.png')
                  }
                />
              </div>
              <div className={`${styles['box_90']} flex-row`}>
                <span className={`${styles['text_328']}`}>书房</span>
                <span className={`${styles['text_329']}`}>0个设备</span>
                <img
                  className={`${styles['label_105']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_128']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_91']} flex-row`}>
                <span className={`${styles['text_330']}`}>餐厅</span>
                <span className={`${styles['text_331']}`}>0个设备</span>
                <img
                  className={`${styles['label_106']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_129']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_92']} flex-col`}>
                <span className={`${styles['text_332']}`}>添加房间</span>
                <img
                  className={`${styles['image_93']}`}
                  src={
                    require('./assets/img/SketchPng371cd13786705680a97e951159762d3cf050ee95d1b341f3ec248924872e1a4e.png')
                  }
                />
              </div>
              <img
                className={`${styles['image_94']}`}
                src={
                  require('./assets/img/SketchPng87d62995fad6a987b3ed54aeb88e7dc8168192760fbabefd1bca58d3e9aaa303.png')
                }
              />
            </div>
            <span className={`${styles['text_333']}`}>完成编辑</span>
            <span className={`${styles['text_334']}`}>保存以调整排序以及删除的房间列表</span>
          </div>
          <div className={`${styles['block_35']} flex-col`}>
            <div className={`${styles['block_36']} flex-col`}>
              <div className={`${styles['section_48']} flex-row`}>
                <span className={`${styles['text_335']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_130']}`}
                  src={
                    require('./assets/img/SketchPng515c297a962a9362d15b73f794de6b9bcc10e2937d152d06615ca8e2335dd8e4.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_131']}`}
                  src={
                    require('./assets/img/SketchPng81fdd6f7277450185e0a172ca32db6fd7a6571cd607a17f5cf402f2b72fe55fb.png')
                  }
                />
                <img
                  className={`${styles['image_95']}`}
                  src={
                    require('./assets/img/SketchPngf185db1ee3d8081f83697d5c73747194197f13e54cdd32f0dbe245f1cd035938.png')
                  }
                />
              </div>
              <div className={`${styles['section_49']} flex-row`}>
                <div className={`${styles['box_93']} flex-col`}>
                  <div className={`${styles['image-wrapper_56']} flex-col`}>
                    <img
                      className={`${styles['label_107']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_336']}`}>示例</span>
                <div className={`${styles['box_94']} flex-row`}>
                  <div className={`${styles['group_113']} flex-col`}>
                    <div className={`${styles['image-wrapper_57']} flex-col`}>
                      <img
                        className={`${styles['label_108']}`}
                        src={
                          require('./assets/img/SketchPng41d1e98824f4b83981d0f104d1ee23379532a3aa550c7bd0d8c99149de7f1e61.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_337']}`}>添加房间&nbsp;2个</span>
                  <span className={`${styles['text_338']}`}>确认</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_84']} flex-row justify-between`}>
                <span className={`${styles['text_339']}`}>房间名称</span>
                <span className={`${styles['text_340']}`}>0/20</span>
              </div>
              <div className={`${styles['section_50']} flex-row justify-between`}>
                <span className={`${styles['text_341']}`}>请输入房间名称</span>
                <img
                  className={`${styles['label_109']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
              </div>
              <span className={`${styles['text_342']}`}>推荐名称</span>
              <div className={`${styles['text-wrapper_85']} flex-col`}>
                <span className={`${styles['text_343']}`}>书房</span>
              </div>
              <div className={`${styles['text-wrapper_86']} flex-col`}>
                <span className={`${styles['text_344']}`}>儿童房</span>
              </div>
              <div className={`${styles['section_51']} flex-row`}>
                <span className={`${styles['text_345']}`}>餐厅</span>
                <img
                  className={`${styles['label_110']}`}
                  src={
                    require('./assets/img/SketchPng972e47793e0029588e3dce54bb5081aca5215d9f0f02bd9c6405044df52cee25.png')
                  }
                />
              </div>
              <div className={`${styles['text-wrapper_87']} flex-col`}>
                <span className={`${styles['text_346']}`}>阳台</span>
              </div>
              <div className={`${styles['text-wrapper_88']} flex-col`}>
                <span className={`${styles['text_347']}`}>浴室</span>
              </div>
              <div className={`${styles['text-wrapper_89']} flex-col`}>
                <span className={`${styles['text_348']}`}>地下室</span>
              </div>
              <img
                className={`${styles['image_96']}`}
                src={
                  require('./assets/img/SketchPng87d62995fad6a987b3ed54aeb88e7dc8168192760fbabefd1bca58d3e9aaa303.png')
                }
              />
            </div>
            <span className={`${styles['text_349']}`}>添加房间（反显顶部已选数量）</span>
            <span className={`${styles['paragraph_10']}`}>
              1、可通过输入名称添加
              <br />
              2、可点击推荐房间勾选添加（多选）
            </span>
          </div>
          <div className={`${styles['block_37']} flex-col`}>
            <div className={`${styles['section_52']} flex-col`}>
              <div className={`${styles['group_114']} flex-row`}>
                <span className={`${styles['text_350']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_132']}`}
                  src={
                    require('./assets/img/SketchPng515c297a962a9362d15b73f794de6b9bcc10e2937d152d06615ca8e2335dd8e4.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_133']}`}
                  src={
                    require('./assets/img/SketchPng81fdd6f7277450185e0a172ca32db6fd7a6571cd607a17f5cf402f2b72fe55fb.png')
                  }
                />
                <img
                  className={`${styles['image_97']}`}
                  src={
                    require('./assets/img/SketchPngf185db1ee3d8081f83697d5c73747194197f13e54cdd32f0dbe245f1cd035938.png')
                  }
                />
              </div>
              <div className={`${styles['group_115']} flex-row`}>
                <div className={`${styles['box_95']} flex-col`}>
                  <div className={`${styles['image-wrapper_58']} flex-col`}>
                    <img
                      className={`${styles['label_111']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_351']}`}>示例</span>
                <div className={`${styles['box_96']} flex-row`}>
                  <div className={`${styles['box_97']} flex-col`}>
                    <div className={`${styles['image-wrapper_59']} flex-col`}>
                      <img
                        className={`${styles['label_112']}`}
                        src={
                          require('./assets/img/SketchPng41d1e98824f4b83981d0f104d1ee23379532a3aa550c7bd0d8c99149de7f1e61.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_352']}`}>房间管理</span>
                  <span className={`${styles['text_353']}`}>编辑</span>
                </div>
              </div>
              <div className={`${styles['group_116']} flex-row`}>
                <span className={`${styles['text_354']}`}>客厅</span>
                <span className={`${styles['text_355']}`}>3个设备</span>
                <img
                  className={`${styles['label_113']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_134']}`}
                  src={
                    require('./assets/img/SketchPng7f09959836a2310ceafbf0bfaf6bffc9f03b398a4eefebb4d6db1a9d7e8a950f.png')
                  }
                />
              </div>
              <div className={`${styles['group_117']} flex-row`}>
                <div className={`${styles['group_118']} flex-col`}>
                  <div className={`${styles['image-wrapper_60']} flex-col`}>
                    <img
                      className={`${styles['image_98']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_114']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_356']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['group_119']} flex-row`}>
                <div className={`${styles['group_120']} flex-col`}>
                  <div className={`${styles['image-wrapper_61']} flex-col`}>
                    <img
                      className={`${styles['image_99']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_115']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_357']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['group_121']} flex-row`}>
                <div className={`${styles['box_98']} flex-col`}>
                  <div className={`${styles['image-wrapper_62']} flex-col`}>
                    <img
                      className={`${styles['image_100']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_116']}`}
                      src={
                        require('./assets/img/SketchPng24aff5b38a5553b0fd6d16c34700de7b7c38d7cfe3457e248f6cfb6e7dd6b526.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_358']}`}>Air&nbsp;Conditioner</span>
              </div>
              <div className={`${styles['group_122']} flex-row`}>
                <span className={`${styles['text_359']}`}>次卧</span>
                <span className={`${styles['text_360']}`}>0个设备</span>
                <img
                  className={`${styles['label_117']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_135']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['group_123']} flex-row`}>
                <span className={`${styles['text_361']}`}>厨房</span>
                <span className={`${styles['text_362']}`}>0个设备</span>
                <img
                  className={`${styles['label_118']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_136']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
                <div className={`${styles['text-wrapper_90']} flex-col`}>
                  <span className={`${styles['text_363']}`}>添加成功</span>
                </div>
              </div>
              <div className={`${styles['group_124']} flex-row`}>
                <span className={`${styles['text_364']}`}>分享给我</span>
                <span className={`${styles['text_365']}`}>1个设备</span>
                <img
                  className={`${styles['label_119']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_137']}`}
                  src={
                    require('./assets/img/SketchPng7f09959836a2310ceafbf0bfaf6bffc9f03b398a4eefebb4d6db1a9d7e8a950f.png')
                  }
                />
              </div>
              <div className={`${styles['group_125']} flex-row`}>
                <span className={`${styles['text_366']}`}>书房</span>
                <span className={`${styles['text_367']}`}>0个设备</span>
                <img
                  className={`${styles['label_120']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_138']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['group_126']} flex-row`}>
                <span className={`${styles['text_368']}`}>餐厅</span>
                <span className={`${styles['text_369']}`}>0个设备</span>
                <img
                  className={`${styles['label_121']}`}
                  src={
                    require('./assets/img/SketchPnge6f1d723527d54bacd277f1f53762d0982566a6e4a5ade5470ca44f353216368.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_139']}`}
                  src={
                    require('./assets/img/SketchPnga421a475e9453688d99f2a8be295968ab1ac3e2f0e76a9f2d665a2c448fc08c0.png')
                  }
                />
              </div>
              <div className={`${styles['text-wrapper_91']} flex-col`}>
                <span className={`${styles['text_370']}`}>添加房间</span>
              </div>
              <img
                className={`${styles['image_101']}`}
                src={
                  require('./assets/img/SketchPng87d62995fad6a987b3ed54aeb88e7dc8168192760fbabefd1bca58d3e9aaa303.png')
                }
              />
              <div className={`${styles['group_127']} flex-col`} />
            </div>
            <span className={`${styles['text_371']}`}>添加成功（3s）</span>
            <span className={`${styles['text_372']}`}>新增房间反显在列表后面</span>
          </div>
        </div>
        <div className={`${styles['section_53']} flex-row`}>
          <div className={`${styles['box_99']} flex-row justify-between`}>
            <div className={`${styles['image-text_4']} flex-row justify-between`}>
              <img
                className={`${styles['label_122']}`}
                src={
                  require('./assets/img/SketchPng85fe7d07593fc1920a0b4d0cb45d6a8678d936c109017895b558657d3872895a.png')
                }
              />
              <span className={`${styles['text-group_5']}`}>语言</span>
            </div>
            <div className={`${styles['image-text_5']} flex-row justify-between`}>
              <span className={`${styles['text-group_6']}`}>跟随系统</span>
              <div className={`${styles['image-wrapper_63']} flex-col`}>
                <img
                  className={`${styles['image_102']}`}
                  src={
                    require('./assets/img/SketchPng72ed3696cd7bdb0d60b7a26c82c2340951bc407849b105e8013e3dfd3c6cec41.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['box_100']} flex-col`}>
            <div className={`${styles['block_38']} flex-row`}>
              <span className={`${styles['text_373']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_140']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_141']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_103']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['block_39']} flex-row`}>
              <div className={`${styles['section_54']} flex-col`}>
                <div className={`${styles['image-wrapper_64']} flex-col`}>
                  <img
                    className={`${styles['label_123']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_374']}`}>示例</span>
              <div className={`${styles['section_55']} flex-row`}>
                <div className={`${styles['image-text_6']} flex-row justify-between`}>
                  <div className={`${styles['group_128']} flex-col`}>
                    <div className={`${styles['image-wrapper_65']} flex-col`}>
                      <img
                        className={`${styles['label_124']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_7']}`}>语言</span>
                </div>
              </div>
            </div>
            <div className={`${styles['text-wrapper_92']} flex-col`}>
              <span className={`${styles['text_375']}`}>跟随系统（当前）</span>
            </div>
            <div className={`${styles['text-wrapper_93']} flex-col`}>
              <span className={`${styles['text_376']}`}>简体中文</span>
            </div>
            <div className={`${styles['text-wrapper_94']} flex-col`}>
              <span className={`${styles['text_377']}`}>English</span>
            </div>
            <div className={`${styles['text-wrapper_95']} flex-col`}>
              <span className={`${styles['text_378']}`}>Deutsch</span>
            </div>
            <div className={`${styles['text-wrapper_96']} flex-col`}>
              <span className={`${styles['text_379']}`}>Français</span>
            </div>
            <div className={`${styles['text-wrapper_97']} flex-col`}>
              <span className={`${styles['text_380']}`}>Español</span>
            </div>
            <div className={`${styles['text-wrapper_98']} flex-col`}>
              <span className={`${styles['text_381']}`}>Italiano</span>
            </div>
            <img
              className={`${styles['image_104']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['box_101']} flex-row justify-between`}>
            <div className={`${styles['image-text_7']} flex-row justify-between`}>
              <img
                className={`${styles['label_125']}`}
                src={
                  require('./assets/img/SketchPng0ce7e0e23a249d8c85bd5936d6acff294b3c092ad601e809fc7e58d5c6f89a6b.png')
                }
              />
              <span className={`${styles['text-group_8']}`}>关于</span>
            </div>
            <div className={`${styles['image-wrapper_66']} flex-col`}>
              <img
                className={`${styles['image_105']}`}
                src={
                  require('./assets/img/SketchPngaa85819e67aaf7d01a06e8e0de1d10b2d1620c15988044a31025a78e7465061a.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['box_102']} flex-col`}>
            <div className={`${styles['group_129']} flex-row`}>
              <span className={`${styles['text_382']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_142']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_143']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_106']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_130']} flex-row`}>
              <div className={`${styles['group_131']} flex-col`}>
                <div className={`${styles['image-wrapper_67']} flex-col`}>
                  <img
                    className={`${styles['label_126']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_383']}`}>示例</span>
              <div className={`${styles['group_132']} flex-row`}>
                <div className={`${styles['image-text_8']} flex-row justify-between`}>
                  <div className={`${styles['box_103']} flex-col`}>
                    <div className={`${styles['image-wrapper_68']} flex-col`}>
                      <img
                        className={`${styles['label_127']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_9']}`}>关于</span>
                </div>
              </div>
            </div>
            <div className={`${styles['image-text_9']} flex-col justify-between`}>
              <img
                className={`${styles['image_107']}`}
                src={
                  require('./assets/img/SketchPng6118113ba4e89913c756ee50e4927ac0ffa2ffa4d7e820ebd0a2b08d7c97483c.png')
                }
              />
              <div className={`${styles['text-group_10']} flex-col justify-between`}>
                <span className={`${styles['text_384']}`}>ANTARICTIC&nbsp;STAR</span>
                <span className={`${styles['text_385']}`}>版本：1.0.1</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_99']} flex-col`}>
              <span className={`${styles['text_386']}`}>系统权限</span>
            </div>
            <div className={`${styles['text-wrapper_100']} flex-col`}>
              <span className={`${styles['text_387']}`}>隐私政策管理</span>
            </div>
            <img
              className={`${styles['image_108']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <span className={`${styles['text_388']}`}>跳转</span>
          <div className={`${styles['image-wrapper_69']} flex-col`}>
            <img
              className={`${styles['image_109']}`}
              src={
                require('./assets/img/SketchPngdb1469fd889030ba9c55883ca3e3a4d15efa01de57b7058254dd4332a87628df.png')
              }
            />
          </div>
          <div className={`${styles['box_104']} flex-col`}>
            <div className={`${styles['group_133']} flex-row`}>
              <span className={`${styles['text_389']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_144']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_145']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_110']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_134']} flex-row`}>
              <div className={`${styles['box_105']} flex-col`}>
                <div className={`${styles['image-wrapper_70']} flex-col`}>
                  <img
                    className={`${styles['label_128']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_390']}`}>示例</span>
              <div className={`${styles['box_106']} flex-row`}>
                <div className={`${styles['image-text_10']} flex-row justify-between`}>
                  <div className={`${styles['block_40']} flex-col`}>
                    <div className={`${styles['image-wrapper_71']} flex-col`}>
                      <img
                        className={`${styles['label_129']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_11']}`}>隐私政策管理</span>
                </div>
              </div>
            </div>
            <div className={`${styles['group_135']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_101']} flex-col`}>
                <span className={`${styles['paragraph_11']}`}>
                  服务条款
                  <br />
                  We&nbsp;respect&nbsp;your&nbsp;personal&nbsp;privacy.&nbsp;This&nbsp;Privacy&nbsp;Policy&nbsp;explains&nbsp;how&nbsp;we&nbsp;collect,&nbsp;store,&nbsp;use&nbsp;and&nbsp;protect&nbsp;your&nbsp;information&nbsp;when&nbsp;you&nbsp;connect&nbsp;and&nbsp;control&nbsp;our&nbsp;smart&nbsp;appliances.
                  <br />
                  Data&nbsp;we&nbsp;collect&nbsp;includes&nbsp;device&nbsp;operation&nbsp;logs,&nbsp;Wi-Fi&nbsp;connection&nbsp;status,&nbsp;account&nbsp;email&nbsp;and&nbsp;equipment&nbsp;serial&nbsp;number,&nbsp;only&nbsp;for&nbsp;providing&nbsp;stable&nbsp;product&nbsp;functions,&nbsp;troubleshooting&nbsp;and&nbsp;service&nbsp;optimization.&nbsp;We&nbsp;will&nbsp;never&nbsp;sell&nbsp;your&nbsp;personal&nbsp;data&nbsp;to&nbsp;third&nbsp;parties&nbsp;without&nbsp;your&nbsp;explicit&nbsp;permission.
                  <br />
                  You&nbsp;can&nbsp;view&nbsp;the&nbsp;full&nbsp;Privacy&nbsp;Policy&nbsp;via&nbsp;the&nbsp;link&nbsp;below,&nbsp;and&nbsp;adjust&nbsp;your&nbsp;data&nbsp;access&nbsp;permissions&nbsp;anytime&nbsp;in&nbsp;Settings.We&nbsp;respect&nbsp;your&nbsp;personal&nbsp;privacy.&nbsp;This&nbsp;Privacy&nbsp;Policy&nbsp;explains&nbsp;how&nbsp;we&nbsp;collect,&nbsp;store,&nbsp;use&nbsp;and&nbsp;protect&nbsp;your&nbsp;information&nbsp;when&nbsp;you&nbsp;connect&nbsp;and&nbsp;control&nbsp;our&nbsp;smart&nbsp;appliances.
                  <br />
                  Data&nbsp;we&nbsp;collect&nbsp;includes&nbsp;device&nbsp;operation&nbsp;logs,&nbsp;Wi-Fi&nbsp;connection&nbsp;status,&nbsp;account&nbsp;email&nbsp;and&nbsp;equipment&nbsp;serial&nbsp;number,&nbsp;only&nbsp;for&nbsp;providing&nbsp;stable&nbsp;product&nbsp;functions,&nbsp;troubleshooting&nbsp;and&nbsp;service&nbsp;optimization.&nbsp;We&nbsp;will&nbsp;never&nbsp;sell&nbsp;your&nbsp;personal&nbsp;data&nbsp;to&nbsp;third&nbsp;parties&nbsp;without&nbsp;your&nbsp;explicit&nbsp;permission.
                  <br />
                  You&nbsp;can&nbsp;view&nbsp;the&nbsp;full&nbsp;Privacy&nbsp;Policy&nbsp;via&nbsp;the&nbsp;link&nbsp;below,&nbsp;and&nbsp;adjust&nbsp;your&nbsp;data&nbsp;access&nbsp;permissions&nbsp;anytime&nbsp;in&nbsp;Settings.We&nbsp;respect&nbsp;your&nbsp;personal&nbsp;privacy.&nbsp;This&nbsp;Privacy&nbsp;Policy&nbsp;explains&nbsp;how&nbsp;we&nbsp;collect,&nbsp;store,&nbsp;use&nbsp;and&nbsp;protect&nbsp;your&nbsp;information&nbsp;when&nbsp;you&nbsp;connect&nbsp;and&nbsp;control&nbsp;our&nbsp;smart&nbsp;appliances.
                  <br />
                  Data&nbsp;we&nbsp;collect&nbsp;includes&nbsp;device&nbsp;operation&nbsp;logs,&nbsp;Wi-Fi&nbsp;connection&nbsp;status,&nbsp;account&nbsp;email&nbsp;and&nbsp;equipment&nbsp;serial&nbsp;number,&nbsp;only&nbsp;for&nbsp;providing&nbsp;stable&nbsp;product&nbsp;functions,&nbsp;troubleshooting&nbsp;and&nbsp;service&nbsp;optimization.&nbsp;We&nbsp;will&nbsp;never&nbsp;sell&nbsp;your&nbsp;personal&nbsp;data&nbsp;to&nbsp;third&nbsp;parties&nbsp;without&nbsp;your&nbsp;explicit&nbsp;permission.
                  <br />
                  You&nbsp;can&nbsp;view&nbsp;the&nbsp;full&nbsp;Privacy&nbsp;Policy&nbsp;via&nbsp;the&nbsp;link&nbsp;below,&nbsp;and&nbsp;adjust&nbsp;your&nbsp;data&nbsp;access&nbsp;permissions&nbsp;anytime&nbsp;in&nbsp;Settings.We&nbsp;respect&nbsp;your&nbsp;personal&nbsp;privacy.&nbsp;This&nbsp;Privacy&nbsp;Policy&nbsp;explains&nbsp;how&nbsp;we&nbsp;collect,&nbsp;store,&nbsp;use&nbsp;and&nbsp;protect&nbsp;your&nbsp;information&nbsp;when&nbsp;you&nbsp;connect&nbsp;and&nbsp;control&nbsp;our&nbsp;smart&nbsp;appliances.
                  <br />
                  Data&nbsp;we&nbsp;collect&nbsp;includes&nbsp;device&nbsp;operation&nbsp;logs,&nbsp;Wi-Fi&nbsp;connection&nbsp;status,&nbsp;account&nbsp;email&nbsp;and&nbsp;equipment&nbsp;serial&nbsp;number,&nbsp;only&nbsp;for&nbsp;providing&nbsp;stable&nbsp;product&nbsp;functions,&nbsp;troubleshooting&nbsp;and&nbsp;service&nbsp;optimization.&nbsp;We&nbsp;will&nbsp;never&nbsp;sell&nbsp;your&nbsp;personal&nbsp;data&nbsp;to&nbsp;third&nbsp;parties&nbsp;without&nbsp;your&nbsp;explicit&nbsp;permission.
                  <br />
                  You&nbsp;can&nbsp;view&nbsp;the&nbsp;full&nbsp;Privacy&nbsp;Policy&nbsp;via&nbsp;the&nbsp;link&nbsp;below,&nbsp;and&nbsp;adjust&nbsp;your&nbsp;data&nbsp;access&nbsp;permissions&nbsp;anytime&nbsp;in&nbsp;Settings.
                </span>
              </div>
              <div className={`${styles['block_41']} flex-col`} />
            </div>
            <img
              className={`${styles['image_111']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['box_107']} flex-row justify-between`}>
            <div className={`${styles['image-text_11']} flex-row justify-between`}>
              <img
                className={`${styles['label_130']}`}
                src={
                  require('./assets/img/SketchPng2726c51b44e2661210bc26a58c09d2f355e3e6dc01d2b334a97d698c4509b656.png')
                }
              />
              <span className={`${styles['text-group_12']}`}>联系我们</span>
            </div>
            <div className={`${styles['image-wrapper_72']} flex-col`}>
              <img
                className={`${styles['image_112']}`}
                src={
                  require('./assets/img/SketchPng4e33a884846d4aeeeb4d4afd7939aa6126a840c92bb9ff1268a2d9c98e369da3.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['box_108']} flex-col`}>
            <div className={`${styles['group_136']} flex-row`}>
              <span className={`${styles['text_391']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_146']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_147']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_113']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_137']} flex-row`}>
              <div className={`${styles['group_138']} flex-col`}>
                <div className={`${styles['image-wrapper_73']} flex-col`}>
                  <img
                    className={`${styles['label_131']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_392']}`}>示例</span>
              <div className={`${styles['group_139']} flex-row`}>
                <div className={`${styles['image-text_12']} flex-row justify-between`}>
                  <div className={`${styles['box_109']} flex-col`}>
                    <div className={`${styles['image-wrapper_74']} flex-col`}>
                      <img
                        className={`${styles['label_132']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_13']}`}>联系我们</span>
                </div>
              </div>
            </div>
            <div className={`${styles['group_140']} flex-row`}>
              <div className={`${styles['image-text_13']} flex-row justify-between`}>
                <img
                  className={`${styles['label_133']}`}
                  src={
                    require('./assets/img/SketchPng74b527fc92b242bbf116c3bf10acda5cde4acd2ec246ffbc7f63e107a590206d.png')
                  }
                />
                <div className={`${styles['text-group_14']} flex-col justify-between`}>
                  <span className={`${styles['text_393']}`}>官方邮箱</span>
                  <span className={`${styles['text_394']}`}>aftersale&#64;zafroshop.com</span>
                </div>
              </div>
              <span className={`${styles['text_395']}`}>复制</span>
              <img
                className={`${styles['thumbnail_148']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_102']} flex-col`}>
              <span className={`${styles['text_396']}`}>复制成功</span>
            </div>
            <img
              className={`${styles['image_114']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_115']}`}
            src={
              require('./assets/img/SketchPng4e33a884846d4aeeeb4d4afd7939aa6126a840c92bb9ff1268a2d9c98e369da3.png')
            }
          />
          <div className={`${styles['box_110']} flex-col`}>
            <div className={`${styles['box_111']} flex-row`}>
              <span className={`${styles['text_397']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_149']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_150']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_116']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_112']} flex-row`}>
              <div className={`${styles['section_56']} flex-col`}>
                <div className={`${styles['image-wrapper_75']} flex-col`}>
                  <img
                    className={`${styles['label_134']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_398']}`}>示例</span>
              <div className={`${styles['section_57']} flex-row`}>
                <div className={`${styles['image-text_14']} flex-row justify-between`}>
                  <div className={`${styles['group_141']} flex-col`}>
                    <div className={`${styles['image-wrapper_76']} flex-col`}>
                      <img
                        className={`${styles['label_135']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_15']}`}>联系我们</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_113']} flex-row`}>
              <div className={`${styles['image-text_15']} flex-row justify-between`}>
                <img
                  className={`${styles['label_136']}`}
                  src={
                    require('./assets/img/SketchPng74b527fc92b242bbf116c3bf10acda5cde4acd2ec246ffbc7f63e107a590206d.png')
                  }
                />
                <div className={`${styles['text-group_16']} flex-col justify-between`}>
                  <span className={`${styles['text_399']}`}>官方邮箱</span>
                  <span className={`${styles['text_400']}`}>aftersale&#64;zafroshop.com</span>
                </div>
              </div>
              <span className={`${styles['text_401']}`}>复制</span>
              <img
                className={`${styles['thumbnail_151']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <img
              className={`${styles['image_117']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['box_114']} flex-col`}>
              <div className={`${styles['text-wrapper_103']} flex-col`}>
                <span className={`${styles['text_402']}`}>打开邮箱</span>
              </div>
              <div className={`${styles['block_42']} flex-row`}>
                <div className={`${styles['group_142']} flex-row`}>
                  <div className={`${styles['image-text_16']} flex-col justify-between`}>
                    <div className={`${styles['group_143']} flex-col`} />
                    <span className={`${styles['text-group_17']}`}>Gmail</span>
                  </div>
                  <div className={`${styles['image-text_17']} flex-col justify-between`}>
                    <div className={`${styles['group_143']} flex-col`} />
                    <span className={`${styles['text-group_17']}`}>Gmail</span>
                  </div>
                </div>
                <div className={`${styles['image-text_18']} flex-col justify-between`}>
                  <div className={`${styles['group_144']} flex-col`} />
                  <span className={`${styles['text-group_18']}`}>Mail</span>
                </div>
                <div className={`${styles['image-text_19']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_137']}`}
                    src={
                      require('./assets/img/SketchPngaaebe535aea59cb268ff0fb9c5dc778e70582b2d6cf9bd2c932389db8ce8f65c.png')
                    }
                  />
                  <span className={`${styles['text-group_19']}`}>功能</span>
                </div>
                <div className={`${styles['image-text_20']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_138']}`}
                    src={
                      require('./assets/img/SketchPng1a32f9941ea2a530387db189ec3133ac9d72119532222ea1985ae028c714c5d4.png')
                    }
                  />
                  <span className={`${styles['text-group_20']}`}>功能</span>
                </div>
                <div className={`${styles['image-text_21']} flex-col justify-between`}>
                  <div className={`${styles['group_144']} flex-col`} />
                  <span className={`${styles['text-group_18']}`}>Mail</span>
                </div>
                <div className={`${styles['image-text_22']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_137']}`}
                    src={
                      require('./assets/img/SketchPngaaebe535aea59cb268ff0fb9c5dc778e70582b2d6cf9bd2c932389db8ce8f65c.png')
                    }
                  />
                  <span className={`${styles['text-group_19']}`}>功能</span>
                </div>
                <div className={`${styles['image-text_23']} flex-col justify-between`}>
                  <img
                    className={`${styles['label_138']}`}
                    src={
                      require('./assets/img/SketchPng1a32f9941ea2a530387db189ec3133ac9d72119532222ea1985ae028c714c5d4.png')
                    }
                  />
                  <span className={`${styles['text-group_20']}`}>功能</span>
                </div>
              </div>
              <div className={`${styles['block_43']} flex-col`} />
              <div className={`${styles['block_44']} flex-row`}>
                <div className={`${styles['text-wrapper_104']} flex-col`}>
                  <span className={`${styles['text_403']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_105']} flex-col`}>
                  <span className={`${styles['text_404']}`}>确定</span>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_118']}`}
            src={
              require('./assets/img/SketchPngaa85819e67aaf7d01a06e8e0de1d10b2d1620c15988044a31025a78e7465061a.png')
            }
          />
        </div>
        <div className={`${styles['section_58']} flex-row`}>
          <div className={`${styles['text-wrapper_106']} flex-col justify-between`}>
            <span className={`${styles['text_405']}`}>语音</span>
            <span className={`${styles['paragraph_12']}`}>
              1、默认跟随系统语音
              <br />
              2、上拉抽屉选择器-点选
            </span>
          </div>
          <span className={`${styles['text_406']}`}>关于</span>
          <span className={`${styles['text_407']}`}>跳转系统打开权限</span>
          <span className={`${styles['text_408']}`}>隐私政策</span>
          <span className={`${styles['paragraph_13']}`}>
            联系我们
            <br />
            可复制邮箱或打开
          </span>
          <span className={`${styles['text_409']}`}>调起系统邮箱</span>
        </div>
        <div className={`${styles['section_59']} flex-row`}>
          <div className={`${styles['group_145']} flex-row justify-between`}>
            <div className={`${styles['image-text_24']} flex-row justify-between`}>
              <img
                className={`${styles['label_139']}`}
                src={
                  require('./assets/img/SketchPngc09d7eb9e329efe160bb010857c9110bada73491f2442a7029a889dfed178acf.png')
                }
              />
              <span className={`${styles['text-group_21']}`}>问题反馈</span>
            </div>
            <img
              className={`${styles['thumbnail_152']}`}
              src={
                require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
              }
            />
          </div>
          <img
            className={`${styles['image_119']}`}
            src={
              require('./assets/img/SketchPng4e33a884846d4aeeeb4d4afd7939aa6126a840c92bb9ff1268a2d9c98e369da3.png')
            }
          />
          <div className={`${styles['group_146']} flex-col justify-end`}>
            <div className={`${styles['block_45']} flex-row`}>
              <div className={`${styles['image-text_25']} flex-row justify-between`}>
                <div className={`${styles['section_60']} flex-col`}>
                  <div className={`${styles['image-wrapper_77']} flex-col`}>
                    <img
                      className={`${styles['label_140']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_22']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['block_46']} flex-row`}>
              <div className={`${styles['image-text_26']} flex-row justify-between`}>
                <div className={`${styles['box_115']} flex-col`}>
                  <div className={`${styles['image-wrapper_78']} flex-col`}>
                    <img
                      className={`${styles['image_120']}`}
                      src={
                        require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_121']}`}
                    src={
                      require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_23']} flex-col`}>
                  <span className={`${styles['text_410']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_411']}`}>RW-400PRO</span>
                  <span className={`${styles['text_412']}`}>其他问题</span>
                </div>
              </div>
              <div className={`${styles['section_61']} flex-row`}>
                <span className={`${styles['text_413']}`}>已提交</span>
                <div className={`${styles['group_147']} flex-col`} />
              </div>
            </div>
            <div className={`${styles['block_47']} flex-row`}>
              <div className={`${styles['image-text_27']} flex-row justify-between`}>
                <div className={`${styles['group_148']} flex-col`}>
                  <div className={`${styles['box_116']} flex-col`}>
                    <div className={`${styles['section_62']} flex-col`}>
                      <div className={`${styles['group_149']} flex-col`} />
                    </div>
                    <img
                      className={`${styles['image_122']}`}
                      src={
                        require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-group_24']} flex-col`}>
                  <span className={`${styles['text_414']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_415']}`}>RW-400PRO</span>
                  <span className={`${styles['text_416']}`}>APP问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_107']} flex-col`}>
                <span className={`${styles['text_417']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['block_48']} flex-row`}>
              <div className={`${styles['image-text_28']} flex-row justify-between`}>
                <div className={`${styles['box_117']} flex-col`}>
                  <div className={`${styles['image-wrapper_79']} flex-col`}>
                    <img
                      className={`${styles['image_123']}`}
                      src={
                        require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_124']}`}
                    src={
                      require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_25']} flex-col`}>
                  <span className={`${styles['text_418']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_419']}`}>RW-400PRO</span>
                  <span className={`${styles['text_420']}`}>设备问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_108']} flex-col`}>
                <span className={`${styles['text_421']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['block_49']} flex-row`}>
              <div className={`${styles['image-text_29']} flex-row justify-between`}>
                <div className={`${styles['block_50']} flex-col`}>
                  <div className={`${styles['image-wrapper_80']} flex-col`}>
                    <img
                      className={`${styles['image_125']}`}
                      src={
                        require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_126']}`}
                    src={
                      require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_26']} flex-col`}>
                  <span className={`${styles['text_422']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_423']}`}>RW-400PRO</span>
                  <span className={`${styles['text_424']}`}>服务问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_109']} flex-col`}>
                <span className={`${styles['text_425']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_110']} flex-col`}>
              <span className={`${styles['text_426']}`}>我要反馈</span>
            </div>
            <img
              className={`${styles['image_127']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['block_51']} flex-col`} />
            <div className={`${styles['block_52']} flex-col justify-between`}>
              <div className={`${styles['box_118']} flex-row`}>
                <span className={`${styles['text_427']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_153']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_154']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_128']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_119']} flex-row`}>
                <div className={`${styles['image-text_30']} flex-row justify-between`}>
                  <div className={`${styles['box_120']} flex-col`}>
                    <div className={`${styles['image-wrapper_81']} flex-col`}>
                      <img
                        className={`${styles['label_141']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_27']}`}>问题反馈</span>
                </div>
                <div className={`${styles['image-text_31']} flex-row justify-between`}>
                  <div className={`${styles['box_120']} flex-col`}>
                    <div className={`${styles['image-wrapper_81']} flex-col`}>
                      <img
                        className={`${styles['label_141']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_27']}`}>问题反馈</span>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_129']}`}
            src={
              require('./assets/img/SketchPng249d93d94406288298732c386f85e08b951dacecfafdc6638a347cc9f07f1346.png')
            }
          />
          <div className={`${styles['group_150']} flex-col justify-end`}>
            <div className={`${styles['group_151']} flex-row`}>
              <div className={`${styles['image-text_32']} flex-row justify-between`}>
                <div className={`${styles['group_152']} flex-col`}>
                  <div className={`${styles['image-wrapper_82']} flex-col`}>
                    <img
                      className={`${styles['label_142']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_28']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['image-text_33']} flex-col justify-between`}>
              <div className={`${styles['box_121']} flex-row justify-between`}>
                <span className={`${styles['text_428']}`}>产品</span>
                <img
                  className={`${styles['thumbnail_155']}`}
                  src={
                    require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                  }
                />
              </div>
              <span className={`${styles['text-group_29']}`}>如问题不涉及产品，请忽略该选项</span>
            </div>
            <div className={`${styles['group_153']} flex-row justify-between`}>
              <span className={`${styles['text_429']}`}>问题类型</span>
              <img
                className={`${styles['thumbnail_156']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_111']} flex-col`}>
              <span className={`${styles['text_430']}`}>提交</span>
            </div>
            <img
              className={`${styles['image_130']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_154']} flex-col`} />
            <div className={`${styles['group_155']} flex-col justify-between`}>
              <div className={`${styles['box_122']} flex-row`}>
                <span className={`${styles['text_431']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_157']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_158']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_131']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_123']} flex-row`}>
                <div className={`${styles['image-text_34']} flex-row justify-between`}>
                  <div className={`${styles['box_124']} flex-col`}>
                    <div className={`${styles['image-wrapper_83']} flex-col`}>
                      <img
                        className={`${styles['label_143']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_30']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_35']} flex-row justify-between`}>
                  <div className={`${styles['box_124']} flex-col`}>
                    <div className={`${styles['image-wrapper_83']} flex-col`}>
                      <img
                        className={`${styles['label_143']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_30']}`}>我要反馈</span>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_132']}`}
            src={
              require('./assets/img/SketchPng249d93d94406288298732c386f85e08b951dacecfafdc6638a347cc9f07f1346.png')
            }
          />
          <div className={`${styles['group_156']} flex-col justify-end`}>
            <div className={`${styles['block_53']} flex-row`}>
              <div className={`${styles['image-text_36']} flex-row justify-between`}>
                <div className={`${styles['box_125']} flex-col`}>
                  <div className={`${styles['image-wrapper_84']} flex-col`}>
                    <img
                      className={`${styles['label_144']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_31']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['image-text_37']} flex-col justify-between`}>
              <div className={`${styles['block_54']} flex-row justify-between`}>
                <span className={`${styles['text_432']}`}>产品</span>
                <img
                  className={`${styles['thumbnail_159']}`}
                  src={
                    require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                  }
                />
              </div>
              <span className={`${styles['text-group_32']}`}>如问题不涉及产品，请忽略该选项</span>
            </div>
            <div className={`${styles['block_55']} flex-row justify-between`}>
              <span className={`${styles['text_433']}`}>问题类型</span>
              <img
                className={`${styles['thumbnail_160']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['block_56']} flex-col`}>
              <div className={`${styles['text-wrapper_112']} flex-col`}>
                <span className={`${styles['text_434']}`}>选择你要反馈的产品</span>
              </div>
              <div className={`${styles['group_157']} flex-row`}>
                <div className={`${styles['image-text_38']} flex-row justify-between`}>
                  <div className={`${styles['box_126']} flex-col`}>
                    <div className={`${styles['group_158']} flex-col`}>
                      <img
                        className={`${styles['label_145']}`}
                        src={
                          require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                        }
                      />
                      <div className={`${styles['group_159']} flex-col`} />
                      <img
                        className={`${styles['label_146']}`}
                        src={
                          require('./assets/img/SketchPngf4ab47545f1942161a22e8ad426e3340c99af7754a3a2656065f2ccc85619cb9.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-group_33']} flex-col justify-between`}>
                    <span className={`${styles['text_435']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_436']}`}>RW-400PRO</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_160']} flex-row`}>
                <div className={`${styles['image-text_39']} flex-row justify-between`}>
                  <div className={`${styles['block_57']} flex-col`}>
                    <div className={`${styles['image-wrapper_85']} flex-col`}>
                      <img
                        className={`${styles['label_147']}`}
                        src={
                          require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['label_148']}`}
                      src={
                        require('./assets/img/SketchPng9e566c5e7dd59df728f9dbb6af6df6222d3e42337274031e65c561b90a5ad6dd.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_34']} flex-col justify-between`}>
                    <span className={`${styles['text_437']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_438']}`}>RW-400PRO</span>
                  </div>
                </div>
                <img
                  className={`${styles['label_149']}`}
                  src={
                    require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                  }
                />
              </div>
              <div className={`${styles['group_161']} flex-row`}>
                <div className={`${styles['image-text_40']} flex-row justify-between`}>
                  <div className={`${styles['block_58']} flex-col`}>
                    <div className={`${styles['group_162']} flex-col`}>
                      <img
                        className={`${styles['label_150']}`}
                        src={
                          require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                        }
                      />
                      <div className={`${styles['section_63']} flex-col`} />
                      <img
                        className={`${styles['label_151']}`}
                        src={
                          require('./assets/img/SketchPngf4ab47545f1942161a22e8ad426e3340c99af7754a3a2656065f2ccc85619cb9.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-group_35']} flex-col justify-between`}>
                    <span className={`${styles['text_439']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_440']}`}>RW-400PRO</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_163']} flex-row`}>
                <div className={`${styles['image-text_41']} flex-row justify-between`}>
                  <div className={`${styles['block_59']} flex-col`}>
                    <div className={`${styles['image-wrapper_86']} flex-col`}>
                      <img
                        className={`${styles['label_152']}`}
                        src={
                          require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['label_153']}`}
                      src={
                        require('./assets/img/SketchPng9e566c5e7dd59df728f9dbb6af6df6222d3e42337274031e65c561b90a5ad6dd.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_36']} flex-col justify-between`}>
                    <span className={`${styles['text_441']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_442']}`}>RW-400PRO</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['group_164']} flex-col`} />
              <div className={`${styles['group_165']} flex-row`}>
                <div className={`${styles['text-wrapper_113']} flex-col`}>
                  <span className={`${styles['text_443']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_114']} flex-col`}>
                  <span className={`${styles['text_444']}`}>确定</span>
                </div>
              </div>
            </div>
            <div className={`${styles['block_60']} flex-col`} />
            <div className={`${styles['block_61']} flex-col justify-between`}>
              <div className={`${styles['box_127']} flex-row`}>
                <span className={`${styles['text_445']}`}>9:28</span>
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
                  className={`${styles['image_133']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_128']} flex-row`}>
                <div className={`${styles['image-text_42']} flex-row justify-between`}>
                  <div className={`${styles['group_166']} flex-col`}>
                    <div className={`${styles['image-wrapper_87']} flex-col`}>
                      <img
                        className={`${styles['label_154']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_37']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_43']} flex-row justify-between`}>
                  <div className={`${styles['group_166']} flex-col`}>
                    <div className={`${styles['image-wrapper_87']} flex-col`}>
                      <img
                        className={`${styles['label_154']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_37']}`}>我要反馈</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['group_167']} flex-col`}>
            <div className={`${styles['block_62']} flex-row`}>
              <div className={`${styles['box_129']} flex-col`}>
                <div className={`${styles['image-wrapper_88']} flex-col`}>
                  <img
                    className={`${styles['label_155']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_446']}`}>示例</span>
              <div className={`${styles['box_130']} flex-col`} />
            </div>
            <div className={`${styles['image-text_44']} flex-col justify-between`}>
              <div className={`${styles['box_131']} flex-row justify-between`}>
                <div className={`${styles['image-text_45']} flex-row justify-between`}>
                  <div className={`${styles['group_168']} flex-col`}>
                    <div className={`${styles['image-wrapper_89']} flex-col`}>
                      <img
                        className={`${styles['image_134']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_156']}`}
                        src={
                          require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_38']}`}>Air&nbsp;Conditioner</span>
                </div>
                <img
                  className={`${styles['thumbnail_163']}`}
                  src={
                    require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                  }
                />
                <div className={`${styles['image-text_46']} flex-row justify-between`}>
                  <div className={`${styles['group_168']} flex-col`}>
                    <div className={`${styles['image-wrapper_89']} flex-col`}>
                      <img
                        className={`${styles['image_134']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_156']}`}
                        src={
                          require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_38']}`}>Air&nbsp;Conditioner</span>
                </div>
              </div>
              <span className={`${styles['text-group_39']}`}>如问题不涉及产品，请忽略该选项</span>
            </div>
            <div className={`${styles['block_63']} flex-row justify-between`}>
              <span className={`${styles['text_447']}`}>问题类型</span>
              <img
                className={`${styles['thumbnail_164']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_115']} flex-col`}>
              <span className={`${styles['text_448']}`}>提交</span>
            </div>
            <div className={`${styles['block_64']} flex-col justify-between`}>
              <div className={`${styles['group_169']} flex-row`}>
                <span className={`${styles['text_449']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_165']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_166']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_135']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['group_170']} flex-row`}>
                <div className={`${styles['image-text_47']} flex-row justify-between`}>
                  <div className={`${styles['box_132']} flex-col`}>
                    <div className={`${styles['image-wrapper_90']} flex-col`}>
                      <img
                        className={`${styles['label_157']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_40']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_48']} flex-row justify-between`}>
                  <div className={`${styles['box_132']} flex-col`}>
                    <div className={`${styles['image-wrapper_90']} flex-col`}>
                      <img
                        className={`${styles['label_157']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_40']}`}>我要反馈</span>
                </div>
              </div>
            </div>
            <img
              className={`${styles['image_136']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_137']}`}
            src={
              require('./assets/img/SketchPng249d93d94406288298732c386f85e08b951dacecfafdc6638a347cc9f07f1346.png')
            }
          />
          <div className={`${styles['group_171']} flex-col`}>
            <div className={`${styles['group_172']} flex-row`}>
              <div className={`${styles['image-text_49']} flex-row justify-between`}>
                <div className={`${styles['group_173']} flex-col`}>
                  <div className={`${styles['image-wrapper_91']} flex-col`}>
                    <img
                      className={`${styles['label_158']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_41']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['image-text_50']} flex-col justify-between`}>
              <div className={`${styles['block_65']} flex-row justify-between`}>
                <div className={`${styles['image-text_51']} flex-row justify-between`}>
                  <div className={`${styles['section_64']} flex-col`}>
                    <div className={`${styles['image-wrapper_92']} flex-col`}>
                      <img
                        className={`${styles['image_138']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_159']}`}
                        src={
                          require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_42']}`}>Air&nbsp;Conditioner</span>
                </div>
                <img
                  className={`${styles['thumbnail_167']}`}
                  src={
                    require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                  }
                />
                <div className={`${styles['image-text_52']} flex-row justify-between`}>
                  <div className={`${styles['section_64']} flex-col`}>
                    <div className={`${styles['image-wrapper_92']} flex-col`}>
                      <img
                        className={`${styles['image_138']}`}
                        src={
                          require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                        }
                      />
                      <img
                        className={`${styles['label_159']}`}
                        src={
                          require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_42']}`}>Air&nbsp;Conditioner</span>
                </div>
              </div>
              <span className={`${styles['text-group_43']}`}>如问题不涉及产品，请忽略该选项</span>
            </div>
            <div className={`${styles['group_174']} flex-row`}>
              <span className={`${styles['text_450']}`}>问题类型</span>
              <img
                className={`${styles['thumbnail_168']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_175']} flex-col`} />
            <div className={`${styles['group_176']} flex-col justify-between`}>
              <div className={`${styles['section_65']} flex-row`}>
                <span className={`${styles['text_451']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_169']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_170']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_139']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['section_66']} flex-row`}>
                <div className={`${styles['image-text_53']} flex-row justify-between`}>
                  <div className={`${styles['block_66']} flex-col`}>
                    <div className={`${styles['image-wrapper_93']} flex-col`}>
                      <img
                        className={`${styles['label_160']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_44']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_54']} flex-row justify-between`}>
                  <div className={`${styles['block_66']} flex-col`}>
                    <div className={`${styles['image-wrapper_93']} flex-col`}>
                      <img
                        className={`${styles['label_160']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_44']}`}>我要反馈</span>
                </div>
              </div>
            </div>
            <img
              className={`${styles['image_140']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_177']} flex-col`}>
              <div className={`${styles['text-wrapper_116']} flex-col`}>
                <span className={`${styles['text_452']}`}>选择产品的问题类型</span>
              </div>
              <div className={`${styles['text-wrapper_117']} flex-col`}>
                <span className={`${styles['text_453']}`}>APP问题</span>
              </div>
              <div className={`${styles['group_178']} flex-row`}>
                <span className={`${styles['text_454']}`}>设备问题</span>
                <img
                  className={`${styles['label_161']}`}
                  src={
                    require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                  }
                />
              </div>
              <div className={`${styles['text-wrapper_118']} flex-col`}>
                <span className={`${styles['text_455']}`}>服务问题</span>
              </div>
              <div className={`${styles['text-wrapper_119']} flex-col`}>
                <span className={`${styles['text_456']}`}>订单问题</span>
              </div>
              <div className={`${styles['text-wrapper_120']} flex-col`}>
                <span className={`${styles['text_457']}`}>其他</span>
              </div>
              <div className={`${styles['group_179']} flex-col`} />
              <div className={`${styles['group_180']} flex-row`}>
                <div className={`${styles['text-wrapper_121']} flex-col`}>
                  <span className={`${styles['text_458']}`}>取消</span>
                </div>
                <div className={`${styles['text-wrapper_122']} flex-col`}>
                  <span className={`${styles['text_459']}`}>确定</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['group_181']} flex-col justify-end`}>
            <div className={`${styles['box_133']} flex-row`}>
              <div className={`${styles['image-text_55']} flex-row justify-between`}>
                <div className={`${styles['section_67']} flex-col`}>
                  <div className={`${styles['image-wrapper_94']} flex-col`}>
                    <img
                      className={`${styles['label_162']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_45']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['box_134']} flex-row justify-between`}>
              <div className={`${styles['image-text_56']} flex-row justify-between`}>
                <div className={`${styles['box_135']} flex-col`}>
                  <div className={`${styles['image-wrapper_95']} flex-col`}>
                    <img
                      className={`${styles['image_141']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_163']}`}
                      src={
                        require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_46']}`}>Air&nbsp;Conditioner</span>
              </div>
              <img
                className={`${styles['thumbnail_171']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_136']} flex-col`}>
              <div className={`${styles['image-text_57']} flex-col justify-between`}>
                <div className={`${styles['box_137']} flex-row`}>
                  <span className={`${styles['text_460']}`}>设备问题</span>
                  <img
                    className={`${styles['thumbnail_172']}`}
                    src={
                      require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_47']}`}>请详细说明您遇到问题的时间、地点和问题情况</span>
              </div>
              <div className={`${styles['image-text_58']} flex-col justify-between`}>
                <div className={`${styles['image-wrapper_96']} flex-col`}>
                  <img
                    className={`${styles['label_164']}`}
                    src={
                      require('./assets/img/SketchPng6fe28f553bfd92d6a7c36bb1eab9887c7f4cbb336e7f832f7f46de99f860d792.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_48']}`}>最多可上传4个照片</span>
              </div>
              <div className={`${styles['image-text_59']} flex-col justify-between`}>
                <div className={`${styles['image-wrapper_97']} flex-col`}>
                  <img
                    className={`${styles['label_165']}`}
                    src={
                      require('./assets/img/SketchPng6fe28f553bfd92d6a7c36bb1eab9887c7f4cbb336e7f832f7f46de99f860d792.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_49']}`}>最多可上传2个视频</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_123']} flex-col`}>
              <span className={`${styles['text_461']}`}>提交</span>
            </div>
            <img
              className={`${styles['image_142']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['box_138']} flex-col`} />
            <div className={`${styles['box_139']} flex-col justify-between`}>
              <div className={`${styles['box_140']} flex-row`}>
                <span className={`${styles['text_462']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_173']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_174']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_143']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_141']} flex-row`}>
                <div className={`${styles['image-text_60']} flex-row justify-between`}>
                  <div className={`${styles['group_182']} flex-col`}>
                    <div className={`${styles['image-wrapper_98']} flex-col`}>
                      <img
                        className={`${styles['label_166']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_50']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_61']} flex-row justify-between`}>
                  <div className={`${styles['group_182']} flex-col`}>
                    <div className={`${styles['image-wrapper_98']} flex-col`}>
                      <img
                        className={`${styles['label_166']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_50']}`}>我要反馈</span>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_144']}`}
            src={
              require('./assets/img/SketchPng398c7fa04ffb7dd343cd379b772e9ec7a06127d677ae2a39367faef7f370d7fe.png')
            }
          />
          <div className={`${styles['group_183']} flex-col justify-end`}>
            <div className={`${styles['box_142']} flex-row`}>
              <div className={`${styles['image-text_62']} flex-row justify-between`}>
                <div className={`${styles['section_68']} flex-col`}>
                  <div className={`${styles['image-wrapper_99']} flex-col`}>
                    <img
                      className={`${styles['label_167']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_51']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['box_143']} flex-row`}>
              <div className={`${styles['image-text_63']} flex-row justify-between`}>
                <div className={`${styles['group_184']} flex-col`}>
                  <div className={`${styles['image-wrapper_100']} flex-col`}>
                    <img
                      className={`${styles['image_145']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_168']}`}
                      src={
                        require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_52']}`}>Air&nbsp;Conditioner</span>
              </div>
              <img
                className={`${styles['thumbnail_175']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['box_144']} flex-col`}>
              <div className={`${styles['group_185']} flex-row`}>
                <span className={`${styles['text_463']}`}>设备问题</span>
                <img
                  className={`${styles['thumbnail_176']}`}
                  src={
                    require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                  }
                />
              </div>
              <span className={`${styles['text_464']}`}>
                柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。缺水提示持续闪烁，设备无漏水情况。柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后
              </span>
              <div className={`${styles['group_186']} flex-row`}>
                <div className={`${styles['image-wrapper_101']} flex-col`}>
                  <img
                    className={`${styles['label_169']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_102']} flex-col`}>
                  <img
                    className={`${styles['label_170']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_103']} flex-col`}>
                  <img
                    className={`${styles['label_171']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_146']}`}
                  src={
                    require('./assets/img/SketchPng6753ec6105fef5991e2d673a3cd0d4588f6c8c161dd4f1aeb364c5d2fd8fc7d5.png')
                  }
                />
              </div>
              <span className={`${styles['text_465']}`}>最多可上传4个照片</span>
              <div className={`${styles['group_187']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_104']} flex-col`}>
                  <img
                    className={`${styles['label_172']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_105']} flex-col`}>
                  <img
                    className={`${styles['label_173']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_466']}`}>最多可上传2个视频</span>
            </div>
            <div className={`${styles['text-wrapper_124']} flex-col`}>
              <span className={`${styles['text_467']}`}>提交</span>
            </div>
            <img
              className={`${styles['image_147']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['box_145']} flex-col`} />
            <div className={`${styles['box_146']} flex-col justify-between`}>
              <div className={`${styles['box_147']} flex-row`}>
                <span className={`${styles['text_468']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_177']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_178']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_148']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_148']} flex-row`}>
                <div className={`${styles['image-text_64']} flex-row justify-between`}>
                  <div className={`${styles['section_69']} flex-col`}>
                    <div className={`${styles['image-wrapper_106']} flex-col`}>
                      <img
                        className={`${styles['label_174']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_53']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_65']} flex-row justify-between`}>
                  <div className={`${styles['section_69']} flex-col`}>
                    <div className={`${styles['image-wrapper_106']} flex-col`}>
                      <img
                        className={`${styles['label_174']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_53']}`}>我要反馈</span>
                </div>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_149']}`}
            src={
              require('./assets/img/SketchPngf3f92f8b687eae3dfd02982a93c9599f45df1434b9ba0c8ee98f76dcadc6b4bc.png')
            }
          />
          <div className={`${styles['group_188']} flex-col justify-end`}>
            <div className={`${styles['group_189']} flex-row`}>
              <div className={`${styles['image-text_66']} flex-row justify-between`}>
                <div className={`${styles['box_149']} flex-col`}>
                  <div className={`${styles['image-wrapper_107']} flex-col`}>
                    <img
                      className={`${styles['label_175']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_54']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['group_190']} flex-row`}>
              <div className={`${styles['image-text_67']} flex-row justify-between`}>
                <div className={`${styles['block_67']} flex-col`}>
                  <div className={`${styles['image-wrapper_108']} flex-col`}>
                    <img
                      className={`${styles['image_150']}`}
                      src={
                        require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                      }
                    />
                    <img
                      className={`${styles['label_176']}`}
                      src={
                        require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_55']}`}>Air&nbsp;Conditioner</span>
              </div>
              <img
                className={`${styles['thumbnail_179']}`}
                src={
                  require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                }
              />
            </div>
            <div className={`${styles['group_191']} flex-col`}>
              <div className={`${styles['group_192']} flex-row`}>
                <span className={`${styles['text_469']}`}>设备问题</span>
                <img
                  className={`${styles['thumbnail_180']}`}
                  src={
                    require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                  }
                />
              </div>
              <span className={`${styles['text_470']}`}>
                柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。缺水提示持续闪烁，设备无漏水情况。柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后
              </span>
              <div className={`${styles['group_193']} flex-row`}>
                <div className={`${styles['image-wrapper_109']} flex-col`}>
                  <img
                    className={`${styles['label_177']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_110']} flex-col`}>
                  <img
                    className={`${styles['label_178']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_111']} flex-col`}>
                  <img
                    className={`${styles['label_179']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_151']}`}
                  src={
                    require('./assets/img/SketchPng6753ec6105fef5991e2d673a3cd0d4588f6c8c161dd4f1aeb364c5d2fd8fc7d5.png')
                  }
                />
              </div>
              <span className={`${styles['text_471']}`}>最多可上传4个照片</span>
              <div className={`${styles['group_194']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_112']} flex-col`}>
                  <img
                    className={`${styles['label_180']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_113']} flex-col`}>
                  <img
                    className={`${styles['label_181']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_472']}`}>最多可上传2个视频</span>
            </div>
            <div className={`${styles['text-wrapper_125']} flex-col`}>
              <span className={`${styles['text_473']}`}>提交</span>
            </div>
            <img
              className={`${styles['image_152']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_195']} flex-col`} />
            <div className={`${styles['group_196']} flex-col justify-between`}>
              <div className={`${styles['box_150']} flex-row`}>
                <span className={`${styles['text_474']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_181']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_182']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_153']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_151']} flex-row`}>
                <div className={`${styles['image-text_68']} flex-row justify-between`}>
                  <div className={`${styles['block_68']} flex-col`}>
                    <div className={`${styles['image-wrapper_114']} flex-col`}>
                      <img
                        className={`${styles['label_182']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_56']}`}>我要反馈</span>
                </div>
                <div className={`${styles['image-text_69']} flex-row justify-between`}>
                  <div className={`${styles['block_68']} flex-col`}>
                    <div className={`${styles['image-wrapper_114']} flex-col`}>
                      <img
                        className={`${styles['label_182']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_56']}`}>我要反馈</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_126']} flex-col`}>
                <span className={`${styles['text_475']}`}>1/3</span>
              </div>
            </div>
          </div>
          <div className={`${styles['group_197']} flex-col justify-end`}>
            <div className={`${styles['group_198']} flex-row`}>
              <div className={`${styles['image-text_70']} flex-row justify-between`}>
                <div className={`${styles['block_69']} flex-col`}>
                  <div className={`${styles['image-wrapper_115']} flex-col`}>
                    <img
                      className={`${styles['label_183']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_57']}`}>示例</span>
              </div>
            </div>
            <div className={`${styles['image-text_71']} flex-col justify-between`}>
              <div className={`${styles['box_152']} flex-col`}>
                <img
                  className={`${styles['image_154']}`}
                  src={
                    require('./assets/img/SketchPnge7f611504da67c37932b3a630342920d3c550483c37b2b2ec6fddb4249f8e99c.png')
                  }
                />
                <div className={`${styles['group_199']} flex-col`} />
              </div>
              <div className={`${styles['text-group_58']} flex-col justify-between`}>
                <span className={`${styles['text_476']}`}>反馈成功</span>
                <span className={`${styles['text_477']}`}>我们预计在1-3个工作日内回复</span>
              </div>
            </div>
            <img
              className={`${styles['image_155']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_200']} flex-col`} />
            <div className={`${styles['group_201']} flex-col justify-between`}>
              <div className={`${styles['block_70']} flex-row`}>
                <span className={`${styles['text_478']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_183']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_184']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_156']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['block_71']} flex-row`}>
                <img
                  className={`${styles['label_184']}`}
                  src={
                    require('./assets/img/SketchPng57b4b1f3db34a3fb38665fe035761ffb03db38787c74d862c4624e7d71ef902e.png')
                  }
                />
                <span className={`${styles['text_479']}`}>我要反馈</span>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_157']}`}
            src={
              require('./assets/img/SketchPng339b1eb987c7d2383d86bcdac4bc99ba6419552068d7f8c370e961184bcf2395.png')
            }
          />
          <div className={`${styles['group_202']} flex-col`}>
            <div className={`${styles['group_203']} flex-row`}>
              <span className={`${styles['text_480']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_185']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_186']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_158']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_204']} flex-row`}>
              <div className={`${styles['group_205']} flex-col`}>
                <div className={`${styles['image-wrapper_116']} flex-col`}>
                  <img
                    className={`${styles['label_185']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_481']}`}>示例</span>
              <div className={`${styles['group_206']} flex-row`}>
                <div className={`${styles['image-text_72']} flex-row justify-between`}>
                  <div className={`${styles['group_207']} flex-col`}>
                    <div className={`${styles['image-wrapper_117']} flex-col`}>
                      <img
                        className={`${styles['label_186']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_59']}`}>问题反馈</span>
                </div>
              </div>
            </div>
            <div className={`${styles['group_208']} flex-row`}>
              <div className={`${styles['image-text_73']} flex-row justify-between`}>
                <div className={`${styles['group_209']} flex-col`}>
                  <div className={`${styles['block_72']} flex-col`}>
                    <div className={`${styles['box_153']} flex-col`}>
                      <div className={`${styles['section_70']} flex-col`} />
                    </div>
                    <img
                      className={`${styles['image_159']}`}
                      src={
                        require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-group_60']} flex-col`}>
                  <span className={`${styles['text_482']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_483']}`}>RW-400PRO</span>
                  <span className={`${styles['text_484']}`}>订单问题</span>
                </div>
              </div>
              <div className={`${styles['box_154']} flex-row`}>
                <span className={`${styles['text_485']}`}>已提交</span>
                <div className={`${styles['group_210']} flex-col`} />
              </div>
            </div>
            <div className={`${styles['group_211']} flex-row`}>
              <div className={`${styles['image-text_74']} flex-row justify-between`}>
                <div className={`${styles['group_212']} flex-col`}>
                  <div className={`${styles['image-wrapper_118']} flex-col`}>
                    <img
                      className={`${styles['image_160']}`}
                      src={
                        require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_161']}`}
                    src={
                      require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_61']} flex-col`}>
                  <span className={`${styles['text_486']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_487']}`}>RW-400PRO</span>
                  <span className={`${styles['text_488']}`}>其他问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_127']} flex-col`}>
                <span className={`${styles['text_489']}`}>已提交</span>
              </div>
            </div>
            <div className={`${styles['group_213']} flex-row`}>
              <div className={`${styles['image-text_75']} flex-row justify-between`}>
                <div className={`${styles['box_155']} flex-col`}>
                  <div className={`${styles['block_73']} flex-col`}>
                    <div className={`${styles['group_214']} flex-col`}>
                      <div className={`${styles['group_215']} flex-col`} />
                    </div>
                    <img
                      className={`${styles['image_162']}`}
                      src={
                        require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-group_62']} flex-col`}>
                  <span className={`${styles['text_490']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_491']}`}>RW-400PRO</span>
                  <span className={`${styles['text_492']}`}>APP问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_128']} flex-col`}>
                <span className={`${styles['text_493']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['group_216']} flex-row`}>
              <div className={`${styles['image-text_76']} flex-row justify-between`}>
                <div className={`${styles['box_156']} flex-col`}>
                  <div className={`${styles['image-wrapper_119']} flex-col`}>
                    <img
                      className={`${styles['image_163']}`}
                      src={
                        require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_164']}`}
                    src={
                      require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_63']} flex-col`}>
                  <span className={`${styles['text_494']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_495']}`}>RW-400PRO</span>
                  <span className={`${styles['text_496']}`}>设备问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_129']} flex-col`}>
                <span className={`${styles['text_497']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['group_217']} flex-row`}>
              <div className={`${styles['image-text_77']} flex-row justify-between`}>
                <div className={`${styles['section_71']} flex-col`}>
                  <div className={`${styles['image-wrapper_120']} flex-col`}>
                    <img
                      className={`${styles['image_165']}`}
                      src={
                        require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['image_166']}`}
                    src={
                      require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_64']} flex-col`}>
                  <span className={`${styles['text_498']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_499']}`}>RW-400PRO</span>
                  <span className={`${styles['text_500']}`}>服务问题</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_130']} flex-col`}>
                <span className={`${styles['text_501']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_131']} flex-col`}>
              <span className={`${styles['text_502']}`}>我要反馈</span>
            </div>
            <img
              className={`${styles['image_167']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_168']}`}
            src={
              require('./assets/img/SketchPng1da3b618a65395632c6eee5c784206613293219d86c793fd535bae4eaf401de7.png')
            }
          />
          <div className={`${styles['group_218']} flex-col`}>
            <div className={`${styles['group_219']} flex-row`}>
              <span className={`${styles['text_503']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_187']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_188']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_169']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_220']} flex-row`}>
              <div className={`${styles['block_74']} flex-col`}>
                <div className={`${styles['image-wrapper_121']} flex-col`}>
                  <img
                    className={`${styles['label_187']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_504']}`}>示例</span>
              <div className={`${styles['block_75']} flex-row`}>
                <div className={`${styles['image-text_78']} flex-row justify-between`}>
                  <div className={`${styles['section_72']} flex-col`}>
                    <div className={`${styles['image-wrapper_122']} flex-col`}>
                      <img
                        className={`${styles['label_188']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_65']}`}>问题反馈</span>
                </div>
              </div>
            </div>
            <div className={`${styles['group_221']} flex-col`}>
              <div className={`${styles['image-text_79']} flex-col justify-between`}>
                <div className={`${styles['box_157']} flex-row`}>
                  <div className={`${styles['group_222']} flex-row`}>
                    <div className={`${styles['image-text_80']} flex-row justify-between`}>
                      <div className={`${styles['block_76']} flex-col`}>
                        <div className={`${styles['block_77']} flex-col`}>
                          <div className={`${styles['box_158']} flex-col`}>
                            <div className={`${styles['group_223']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_170']}`}
                            src={
                              require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_66']} flex-col`}>
                        <span className={`${styles['text_505']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_506']}`}>RW-400PRO</span>
                        <span className={`${styles['text_507']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_81']} flex-row justify-between`}>
                      <div className={`${styles['block_76']} flex-col`}>
                        <div className={`${styles['block_77']} flex-col`}>
                          <div className={`${styles['box_158']} flex-col`}>
                            <div className={`${styles['group_223']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_170']}`}
                            src={
                              require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_67']} flex-col`}>
                        <span className={`${styles['text_505']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_506']}`}>RW-400PRO</span>
                        <span className={`${styles['text_507']}`}>APP问题</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['group_224']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_132']} flex-col`}>
                      <span className={`${styles['text_508']}`}>已答复</span>
                    </div>
                    <div className={`${styles['image-text_82']} flex-row justify-between`}>
                      <span className={`${styles['text-group_68']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_189']}`}
                        src={
                          require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_83']} flex-row justify-between`}>
                      <span className={`${styles['text-group_68']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_189']}`}
                        src={
                          require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <span className={`${styles['text-group_69']}`}>问题：</span>
              </div>
              <span className={`${styles['text_509']}`}>
                柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。
              </span>
              <span className={`${styles['text_510']}`}>答复：</span>
              <span className={`${styles['text_511']}`}>
                请详细说明书您遇到问题的时间、地点和问题情况。请详细说明书您遇到问题的时间、地点和问题情况。
              </span>
            </div>
            <div className={`${styles['text-wrapper_133']} flex-col`}>
              <span className={`${styles['text_512']}`}>再次反馈</span>
            </div>
            <img
              className={`${styles['image_171']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <img
            className={`${styles['image_172']}`}
            src={
              require('./assets/img/SketchPng1da3b618a65395632c6eee5c784206613293219d86c793fd535bae4eaf401de7.png')
            }
          />
          <div className={`${styles['group_225']} flex-col`}>
            <div className={`${styles['section_73']} flex-row`}>
              <span className={`${styles['text_513']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_190']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_191']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_173']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['section_74']} flex-row`}>
              <div className={`${styles['section_75']} flex-col`}>
                <div className={`${styles['image-wrapper_123']} flex-col`}>
                  <img
                    className={`${styles['label_189']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_514']}`}>示例</span>
              <div className={`${styles['section_76']} flex-row`}>
                <div className={`${styles['image-text_84']} flex-row justify-between`}>
                  <div className={`${styles['group_226']} flex-col`}>
                    <div className={`${styles['image-wrapper_124']} flex-col`}>
                      <img
                        className={`${styles['label_190']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_70']}`}>问题反馈</span>
                </div>
              </div>
            </div>
            <div className={`${styles['section_77']} flex-row`}>
              <div className={`${styles['image-text_85']} flex-row justify-between`}>
                <div className={`${styles['box_159']} flex-col`}>
                  <div className={`${styles['group_227']} flex-col`}>
                    <div className={`${styles['block_78']} flex-col`}>
                      <div className={`${styles['box_160']} flex-col`} />
                    </div>
                    <img
                      className={`${styles['image_174']}`}
                      src={
                        require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-group_71']} flex-col`}>
                  <span className={`${styles['text_515']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_516']}`}>RW-400PRO</span>
                  <span className={`${styles['text_517']}`}>APP问题</span>
                </div>
              </div>
              <div className={`${styles['group_228']} flex-col justify-between`}>
                <div className={`${styles['text-wrapper_134']} flex-col`}>
                  <span className={`${styles['text_518']}`}>已答复</span>
                </div>
                <div className={`${styles['image-text_86']} flex-row justify-between`}>
                  <span className={`${styles['text-group_72']}`}>展开</span>
                  <img
                    className={`${styles['thumbnail_192']}`}
                    src={
                      require('./assets/img/SketchPng2afa7a7f2d8a639c11ea4d251feb8267193724807ea55d465b8d8dab5ea728bc.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['section_78']} flex-col`}>
              <div className={`${styles['image-text_87']} flex-col justify-between`}>
                <div className={`${styles['box_161']} flex-row`}>
                  <span className={`${styles['text_519']}`}>设备问题</span>
                  <img
                    className={`${styles['thumbnail_193']}`}
                    src={
                      require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_73']}`}>请详细说明您遇到问题的时间、地点和问题情况</span>
              </div>
              <div className={`${styles['image-text_88']} flex-col justify-between`}>
                <div className={`${styles['image-wrapper_125']} flex-col`}>
                  <img
                    className={`${styles['label_191']}`}
                    src={
                      require('./assets/img/SketchPng6fe28f553bfd92d6a7c36bb1eab9887c7f4cbb336e7f832f7f46de99f860d792.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_74']}`}>最多可上传4个照片</span>
              </div>
              <div className={`${styles['image-text_89']} flex-col justify-between`}>
                <div className={`${styles['image-wrapper_126']} flex-col`}>
                  <img
                    className={`${styles['label_192']}`}
                    src={
                      require('./assets/img/SketchPng6fe28f553bfd92d6a7c36bb1eab9887c7f4cbb336e7f832f7f46de99f860d792.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_75']}`}>最多可上传2个视频</span>
              </div>
            </div>
            <img
              className={`${styles['image_175']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['section_79']} flex-row`}>
              <div className={`${styles['text-wrapper_135']} flex-col`}>
                <span className={`${styles['text_520']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_136']} flex-col`}>
                <span className={`${styles['text_521']}`}>提交</span>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_176']}`}
            src={
              require('./assets/img/SketchPngc6fe995932f1d9ac58fae585a1194ae8e6aa707c33340d66dc4c5e37552c37fa.png')
            }
          />
          <div className={`${styles['group_229']} flex-col`}>
            <div className={`${styles['image-wrapper_127']} flex-col`}>
              <img
                className={`${styles['image_177']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_162']} flex-col`}>
              <div className={`${styles['block_79']} flex-col`}>
                <div className={`${styles['image-wrapper_128']} flex-col`}>
                  <img
                    className={`${styles['label_193']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['block_80']} flex-col`}>
                <div className={`${styles['section_80']} flex-col`}>
                  <div className={`${styles['image-wrapper_129']} flex-col`}>
                    <img
                      className={`${styles['label_194']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['box_163']} flex-col`}>
              <div className={`${styles['group_230']} flex-row`}>
                <span className={`${styles['text_522']}`}>设备问题</span>
                <img
                  className={`${styles['thumbnail_194']}`}
                  src={
                    require('./assets/img/SketchPngac592143c2ddb2db57f76dbe89c32300983e07557c2646a74f45eac70763a633.png')
                  }
                />
              </div>
              <span className={`${styles['text_523']}`}>
                柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。缺水提示持续闪烁，设备无漏水情况。柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后
              </span>
              <div className={`${styles['group_231']} flex-row`}>
                <div className={`${styles['image-wrapper_130']} flex-col`}>
                  <img
                    className={`${styles['label_195']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_131']} flex-col`}>
                  <img
                    className={`${styles['label_196']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_132']} flex-col`}>
                  <img
                    className={`${styles['label_197']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_178']}`}
                  src={
                    require('./assets/img/SketchPng6753ec6105fef5991e2d673a3cd0d4588f6c8c161dd4f1aeb364c5d2fd8fc7d5.png')
                  }
                />
              </div>
              <span className={`${styles['text_524']}`}>最多可上传4个照片</span>
              <div className={`${styles['group_232']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_133']} flex-col`}>
                  <img
                    className={`${styles['label_198']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_134']} flex-col`}>
                  <img
                    className={`${styles['label_199']}`}
                    src={
                      require('./assets/img/SketchPng799dbe2289de3a8a65bc82bf8339e23a113017c60e696f140c49fd442480b11f.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_525']}`}>最多可上传2个视频</span>
            </div>
            <img
              className={`${styles['image_179']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['box_164']} flex-col`}>
              <div className={`${styles['image-text_90']} flex-col justify-between`}>
                <div className={`${styles['block_81']} flex-row`}>
                  <div className={`${styles['box_165']} flex-row`}>
                    <div className={`${styles['image-text_91']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_76']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_92']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_77']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_93']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_78']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_94']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_79']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_95']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_80']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_167']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_137']} flex-col`}>
                      <span className={`${styles['text_529']}`}>已答复</span>
                    </div>
                    <div className={`${styles['image-text_96']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_97']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_98']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_99']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_100']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <span className={`${styles['text-group_82']}`}>问题：</span>
              </div>
              <span className={`${styles['text_530']}`}>
                柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。
              </span>
              <span className={`${styles['text_531']}`}>答复：</span>
              <span className={`${styles['text_532']}`}>
                请详细说明书您遇到问题的时间、地点和问题情况。请详细说明书您遇到问题的时间、地点和问题情况。
              </span>
              <div className={`${styles['image-text_101']} flex-col justify-between`}>
                <div className={`${styles['block_81']} flex-row`}>
                  <div className={`${styles['box_168']} flex-row`}>
                    <div className={`${styles['image-text_102']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_83']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_103']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_84']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_104']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_85']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_105']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_86']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                    <div className={`${styles['image-text_106']} flex-row justify-between`}>
                      <div className={`${styles['box_166']} flex-col`}>
                        <div className={`${styles['section_81']} flex-col`}>
                          <div className={`${styles['block_82']} flex-col`}>
                            <div className={`${styles['group_233']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_180']}`}
                            src={
                              require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_87']} flex-col`}>
                        <span className={`${styles['text_526']}`}>Air&nbsp;Conditioner</span>
                        <span className={`${styles['text_527']}`}>RW-400PRO</span>
                        <span className={`${styles['text_528']}`}>APP问题</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['box_169']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_137']} flex-col`}>
                      <span className={`${styles['text_529']}`}>已答复</span>
                    </div>
                    <div className={`${styles['image-text_107']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_108']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_109']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_110']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                    <div className={`${styles['image-text_111']} flex-row justify-between`}>
                      <span className={`${styles['text-group_81']}`}>收起</span>
                      <img
                        className={`${styles['thumbnail_195']}`}
                        src={
                          require('./assets/img/SketchPngee099100a3aa3c86f5983776e18aa3a027080f665a43cbdd6eaae37782487c09.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <span className={`${styles['text-group_82']}`}>问题：</span>
              </div>
            </div>
            <div className={`${styles['box_170']} flex-col`}>
              <div className={`${styles['group_234']} flex-col`} />
            </div>
            <div className={`${styles['box_171']} flex-col justify-between`}>
              <div className={`${styles['box_172']} flex-row`}>
                <span className={`${styles['text_533']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_196']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_197']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_181']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_173']} flex-row`}>
                <img
                  className={`${styles['label_200']}`}
                  src={
                    require('./assets/img/SketchPng57b4b1f3db34a3fb38665fe035761ffb03db38787c74d862c4624e7d71ef902e.png')
                  }
                />
                <span className={`${styles['text_534']}`}>我的反馈</span>
              </div>
            </div>
            <div className={`${styles['box_174']} flex-row`}>
              <div className={`${styles['text-wrapper_138']} flex-col`}>
                <span className={`${styles['text_535']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_139']} flex-col`}>
                <span className={`${styles['text_536']}`}>提交</span>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_182']}`}
            src={
              require('./assets/img/SketchPngb2cca3e9450f87fcc78e57f9340f65a2dd25f46de913666fa581f7300728c75a.png')
            }
          />
          <img
            className={`${styles['image_183']}`}
            src={
              require('./assets/img/SketchPng7734bc24c7ce979852b64f1cf28e5b4bfe34d3ce7f19ca3c0d2a2ee8f176db30.png')
            }
          />
          <img
            className={`${styles['image_184']}`}
            src={
              require('./assets/img/SketchPnge1d9754841412fae97cb5822545a5367967ebe7742060c031dff1b02b1315550.png')
            }
          />
        </div>
        <div className={`${styles['section_82']} flex-row`}>
          <div className={`${styles['text-group_88']} flex-col justify-between`}>
            <span className={`${styles['text_537']}`}>问题反馈</span>
            <span className={`${styles['paragraph_14']}`}>
              1、有内容，问题列表，未读置顶
              <br />
              （右侧有红点），排序按时间倒序排列
              <br />
              2、无内容则显示暂无内容缺省图
            </span>
          </div>
          <div className={`${styles['text-group_89']} flex-col justify-between`}>
            <span className={`${styles['text_538']}`}>我要反馈</span>
            <span className={`${styles['text_539']}`}>未操作前提交按钮未激活不可点</span>
          </div>
          <div className={`${styles['text-group_90']} flex-col justify-between`}>
            <span className={`${styles['text_540']}`}>选择产品</span>
            <span className={`${styles['text_541']}`}>上拉抽屉选择器-点选</span>
          </div>
          <span className={`${styles['text_542']}`}>反显已选产品</span>
          <div className={`${styles['text-group_91']} flex-col justify-between`}>
            <span className={`${styles['text_543']}`}>选择问题类型</span>
            <span className={`${styles['text_544']}`}>上拉抽屉选择器-点选</span>
          </div>
          <span className={`${styles['paragraph_15']}`}>
            反显问题类型
            <br />
            下方展开需填写问题描述以及上传材料
          </span>
          <span className={`${styles['paragraph_16']}`}>
            填写完成后，提交按钮激活
            <br />
            1、图片上传最多4张，可点击图
            <br />
            片查看，点击右上角删除图标删除
            <br />
            2、视频上传最多2个，可点击图
            <br />
            片预览视频，点击右上角删除图标删除
          </span>
          <span className={`${styles['paragraph_17']}`}>
            查看所图片
            <br />
            1、固定关闭按钮在右侧
            <br />
            2、左右滑动可切换
            <br />
            3、页签。。。跟随图片底部始终保持16px
          </span>
          <span className={`${styles['text_545']}`}>反馈成功</span>
          <span className={`${styles['text_546']}`}>反显，置顶列表上方，右侧出现未读红点</span>
          <div className={`${styles['text-group_92']} flex-col justify-between`}>
            <span className={`${styles['text_547']}`}>再次反馈</span>
            <span className={`${styles['paragraph_18']}`}>
              问题描述可通过卡片点击展开或收起，
              <br />
              默认展开
            </span>
          </div>
          <span className={`${styles['paragraph_19']}`}>
            1、进入后收起之前问题描述卡片，
            <br />
            2、底部按钮组需填写完之后激活
          </span>
          <span className={`${styles['text_548']}`}>填写完成激活按钮，上下滑动按钮悬浮不动</span>
        </div>
        <div className={`${styles['section_83']} flex-row`}>
          <div className={`${styles['group_235']} flex-row justify-between`}>
            <div className={`${styles['image-text_112']} flex-row justify-between`}>
              <img
                className={`${styles['label_201']}`}
                src={
                  require('./assets/img/SketchPng0ee4c51237f5ce9060686a9b7808226fb7a85b5fccaf358f70b3f49117ce9e13.png')
                }
              />
              <span className={`${styles['text-group_93']}`}>产品说明书</span>
            </div>
            <img
              className={`${styles['thumbnail_198']}`}
              src={
                require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
              }
            />
          </div>
          <div className={`${styles['group_236']} flex-row`}>
            <div className={`${styles['image-text_113']} flex-col justify-between`}>
              <div className={`${styles['box_175']} flex-col`}>
                <div className={`${styles['group_237']} flex-row`}>
                  <span className={`${styles['text_549']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_199']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_200']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_185']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['group_238']} flex-row`}>
                  <div className={`${styles['box_176']} flex-col`}>
                    <div className={`${styles['image-wrapper_135']} flex-col`}>
                      <img
                        className={`${styles['label_202']}`}
                        src={
                          require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_550']}`}>示例</span>
                  <div className={`${styles['box_177']} flex-row`}>
                    <div className={`${styles['image-text_114']} flex-row justify-between`}>
                      <div className={`${styles['section_84']} flex-col`}>
                        <div className={`${styles['image-wrapper_136']} flex-col`}>
                          <img
                            className={`${styles['label_203']}`}
                            src={
                              require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                            }
                          />
                        </div>
                      </div>
                      <span className={`${styles['text-group_94']}`}>产品说明书</span>
                    </div>
                    <div className={`${styles['image-text_115']} flex-row justify-between`}>
                      <div className={`${styles['section_84']} flex-col`}>
                        <div className={`${styles['image-wrapper_136']} flex-col`}>
                          <img
                            className={`${styles['label_203']}`}
                            src={
                              require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                            }
                          />
                        </div>
                      </div>
                      <span className={`${styles['text-group_94']}`}>产品说明书</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_239']} flex-row`}>
                  <div className={`${styles['image-text_116']} flex-row justify-between`}>
                    <div className={`${styles['section_85']} flex-col`}>
                      <div className={`${styles['group_240']} flex-col`}>
                        <div className={`${styles['section_86']} flex-col`}>
                          <div className={`${styles['box_178']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_204']}`}
                          src={
                            require('./assets/img/SketchPng5f71e447f9caa35989360b3f5727ea50b30a176e753bafb8410e17f5f2fced14.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_95']} flex-col justify-between`}>
                      <span className={`${styles['text_551']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_552']}`}>RW-400PRO</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_201']}`}
                    src={
                      require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                    }
                  />
                  <div className={`${styles['image-text_117']} flex-row justify-between`}>
                    <div className={`${styles['section_85']} flex-col`}>
                      <div className={`${styles['group_240']} flex-col`}>
                        <div className={`${styles['section_86']} flex-col`}>
                          <div className={`${styles['box_178']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_204']}`}
                          src={
                            require('./assets/img/SketchPng5f71e447f9caa35989360b3f5727ea50b30a176e753bafb8410e17f5f2fced14.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_96']} flex-col justify-between`}>
                      <span className={`${styles['text_551']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_552']}`}>RW-400PRO</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_241']} flex-row`}>
                  <div className={`${styles['image-text_118']} flex-row justify-between`}>
                    <div className={`${styles['section_87']} flex-col`}>
                      <div className={`${styles['image-wrapper_137']} flex-col`}>
                        <img
                          className={`${styles['label_205']}`}
                          src={
                            require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['label_206']}`}
                        src={
                          require('./assets/img/SketchPng6954f4a0efec9b2c556b244be03f2101ef069a367594e9ee37b525c17c02c9e8.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_97']} flex-col justify-between`}>
                      <span className={`${styles['text_553']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_554']}`}>RW-400PRO</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_202']}`}
                    src={
                      require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                    }
                  />
                  <div className={`${styles['image-text_119']} flex-row justify-between`}>
                    <div className={`${styles['section_87']} flex-col`}>
                      <div className={`${styles['image-wrapper_137']} flex-col`}>
                        <img
                          className={`${styles['label_205']}`}
                          src={
                            require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['label_206']}`}
                        src={
                          require('./assets/img/SketchPng6954f4a0efec9b2c556b244be03f2101ef069a367594e9ee37b525c17c02c9e8.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_98']} flex-col justify-between`}>
                      <span className={`${styles['text_553']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_554']}`}>RW-400PRO</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_242']} flex-row`}>
                  <div className={`${styles['image-text_120']} flex-row justify-between`}>
                    <div className={`${styles['box_179']} flex-col`}>
                      <div className={`${styles['section_88']} flex-col`}>
                        <div className={`${styles['group_243']} flex-col`}>
                          <div className={`${styles['section_89']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_207']}`}
                          src={
                            require('./assets/img/SketchPng5f71e447f9caa35989360b3f5727ea50b30a176e753bafb8410e17f5f2fced14.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_99']} flex-col justify-between`}>
                      <span className={`${styles['text_555']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_556']}`}>RW-400PRO</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_203']}`}
                    src={
                      require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                    }
                  />
                  <div className={`${styles['image-text_121']} flex-row justify-between`}>
                    <div className={`${styles['box_179']} flex-col`}>
                      <div className={`${styles['section_88']} flex-col`}>
                        <div className={`${styles['group_243']} flex-col`}>
                          <div className={`${styles['section_89']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_207']}`}
                          src={
                            require('./assets/img/SketchPng5f71e447f9caa35989360b3f5727ea50b30a176e753bafb8410e17f5f2fced14.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_100']} flex-col justify-between`}>
                      <span className={`${styles['text_555']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_556']}`}>RW-400PRO</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_244']} flex-row`}>
                  <div className={`${styles['image-text_122']} flex-row justify-between`}>
                    <div className={`${styles['section_90']} flex-col`}>
                      <div className={`${styles['image-wrapper_138']} flex-col`}>
                        <img
                          className={`${styles['label_208']}`}
                          src={
                            require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['label_209']}`}
                        src={
                          require('./assets/img/SketchPng6954f4a0efec9b2c556b244be03f2101ef069a367594e9ee37b525c17c02c9e8.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_101']} flex-col justify-between`}>
                      <span className={`${styles['text_557']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_558']}`}>RW-400PRO</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_204']}`}
                    src={
                      require('./assets/img/SketchPngf2b1acb37ac7e4299900a5885d1d496a496b5dd49d0408db6780668caffae019.png')
                    }
                  />
                  <div className={`${styles['image-text_123']} flex-row justify-between`}>
                    <div className={`${styles['section_90']} flex-col`}>
                      <div className={`${styles['image-wrapper_138']} flex-col`}>
                        <img
                          className={`${styles['label_208']}`}
                          src={
                            require('./assets/img/SketchPng2791f4be1aafa774923537f8734c8b8495884150249c1decd18312824d3427b3.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['label_209']}`}
                        src={
                          require('./assets/img/SketchPng6954f4a0efec9b2c556b244be03f2101ef069a367594e9ee37b525c17c02c9e8.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_102']} flex-col justify-between`}>
                      <span className={`${styles['text_557']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_558']}`}>RW-400PRO</span>
                    </div>
                  </div>
                </div>
                <img
                  className={`${styles['image_186']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <span className={`${styles['text-group_103']}`}>
                产品说明书
                <br />
                产品列表
              </span>
            </div>
            <img
              className={`${styles['image_187']}`}
              src={
                require('./assets/img/SketchPng249d93d94406288298732c386f85e08b951dacecfafdc6638a347cc9f07f1346.png')
              }
            />
          </div>
          <div className={`${styles['group_245']} flex-col justify-between`}>
            <div className={`${styles['box_180']} flex-col`}>
              <div className={`${styles['box_181']} flex-row`}>
                <span className={`${styles['text_559']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_205']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_206']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_188']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_182']} flex-row`}>
                <div className={`${styles['box_183']} flex-col`}>
                  <div className={`${styles['image-wrapper_139']} flex-col`}>
                    <img
                      className={`${styles['label_210']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_560']}`}>示例</span>
                <div className={`${styles['box_184']} flex-row`}>
                  <div className={`${styles['image-text_124']} flex-row justify-between`}>
                    <div className={`${styles['section_91']} flex-col`}>
                      <div className={`${styles['image-wrapper_140']} flex-col`}>
                        <img
                          className={`${styles['label_211']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_104']}`}>Air&nbsp;Conditioner产品说明书</span>
                  </div>
                </div>
              </div>
              <img
                className={`${styles['image_189']}`}
                src={
                  require('./assets/img/SketchPng0cf6b3103e9a988574331a03534bf5111e362b62f495787d8f1df3a5592a0a72.png')
                }
              />
              <div className={`${styles['image-wrapper_141']} flex-row justify-between`}>
                <img
                  className={`${styles['label_212']}`}
                  src={
                    require('./assets/img/SketchPngd637114b1cbaba568767297cc69d2186b4da1e970b82a3e379f31ad2ed4cafff.png')
                  }
                />
                <img
                  className={`${styles['label_213']}`}
                  src={
                    require('./assets/img/SketchPng19094ac5b68190071be91fe6293cda4aabf9b9f1c9749de3f4f765f64349f6b1.png')
                  }
                />
              </div>
              <img
                className={`${styles['image_190']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
            <span className={`${styles['paragraph_20']}`}>
              说明书
              <br />
              可左右翻页或点击翻页组件
            </span>
          </div>
          <div className={`${styles['group_246']} flex-row justify-between`}>
            <div className={`${styles['image-text_125']} flex-row justify-between`}>
              <img
                className={`${styles['label_214']}`}
                src={
                  require('./assets/img/SketchPng2c188398301d87a25347eb573cc7ec8a6f5fcb8004e5da4ab39c7fc6a89d227c.png')
                }
              />
              <span className={`${styles['text-group_105']}`}>常见问题</span>
            </div>
            <img
              className={`${styles['thumbnail_207']}`}
              src={
                require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
              }
            />
            <img
              className={`${styles['image_191']}`}
              src={
                require('./assets/img/SketchPng4e33a884846d4aeeeb4d4afd7939aa6126a840c92bb9ff1268a2d9c98e369da3.png')
              }
            />
          </div>
          <div className={`${styles['group_247']} flex-row`}>
            <div className={`${styles['image-text_126']} flex-col justify-between`}>
              <div className={`${styles['group_248']} flex-col`}>
                <div className={`${styles['group_249']} flex-row`}>
                  <span className={`${styles['text_561']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_208']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_209']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_192']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['group_250']} flex-row`}>
                  <div className={`${styles['box_185']} flex-col`}>
                    <div className={`${styles['image-wrapper_142']} flex-col`}>
                      <img
                        className={`${styles['label_215']}`}
                        src={
                          require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_562']}`}>示例</span>
                  <div className={`${styles['box_186']} flex-row`}>
                    <div className={`${styles['image-text_127']} flex-row justify-between`}>
                      <div className={`${styles['box_187']} flex-col`}>
                        <div className={`${styles['image-wrapper_143']} flex-col`}>
                          <img
                            className={`${styles['label_216']}`}
                            src={
                              require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                            }
                          />
                        </div>
                      </div>
                      <span className={`${styles['text-group_106']}`}>常见问题</span>
                    </div>
                    <div className={`${styles['image-text_128']} flex-row justify-between`}>
                      <div className={`${styles['box_187']} flex-col`}>
                        <div className={`${styles['image-wrapper_143']} flex-col`}>
                          <img
                            className={`${styles['label_216']}`}
                            src={
                              require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                            }
                          />
                        </div>
                      </div>
                      <span className={`${styles['text-group_106']}`}>常见问题</span>
                    </div>
                  </div>
                </div>
                <span className={`${styles['text_563']}`}>FAQ</span>
                <div className={`${styles['text-wrapper_140']} flex-col`}>
                  <span className={`${styles['text_564']}`}>如何连接到Alexa？</span>
                </div>
                <div className={`${styles['text-wrapper_141']} flex-col`}>
                  <span className={`${styles['text_565']}`}>无法使用Alexa控制我的设备？</span>
                </div>
                <div className={`${styles['text-wrapper_142']} flex-col`}>
                  <span className={`${styles['text_566']}`}>APP操作无响应？</span>
                </div>
                <div className={`${styles['text-wrapper_143']} flex-col`}>
                  <span className={`${styles['text_567']}`}>Wi-Fi连接异常？</span>
                </div>
                <div className={`${styles['text-wrapper_144']} flex-col`}>
                  <span className={`${styles['text_568']}`}>连接产品Wi-Fi后，APP不可使用？</span>
                </div>
                <div className={`${styles['text-wrapper_145']} flex-col`}>
                  <span className={`${styles['text_569']}`}>如何进行设备分享操作？</span>
                </div>
                <img
                  className={`${styles['image_193']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <span className={`${styles['text-group_107']}`}>
                常见问题
                <br />
                问题列表
              </span>
            </div>
            <img
              className={`${styles['image_194']}`}
              src={
                require('./assets/img/SketchPngc6fe995932f1d9ac58fae585a1194ae8e6aa707c33340d66dc4c5e37552c37fa.png')
              }
            />
          </div>
          <div className={`${styles['image-text_129']} flex-col justify-between`}>
            <div className={`${styles['section_92']} flex-col`}>
              <div className={`${styles['box_188']} flex-row`}>
                <span className={`${styles['text_570']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_210']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_211']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_195']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_189']} flex-row`}>
                <div className={`${styles['box_190']} flex-col`}>
                  <div className={`${styles['image-wrapper_144']} flex-col`}>
                    <img
                      className={`${styles['label_217']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_571']}`}>示例</span>
                <div className={`${styles['box_191']} flex-row`}>
                  <div className={`${styles['image-text_130']} flex-row justify-between`}>
                    <div className={`${styles['box_192']} flex-col`}>
                      <div className={`${styles['image-wrapper_145']} flex-col`}>
                        <img
                          className={`${styles['label_218']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_108']}`}>常见问题</span>
                  </div>
                  <div className={`${styles['image-text_131']} flex-row justify-between`}>
                    <div className={`${styles['box_192']} flex-col`}>
                      <div className={`${styles['image-wrapper_145']} flex-col`}>
                        <img
                          className={`${styles['label_218']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_108']}`}>常见问题</span>
                  </div>
                </div>
              </div>
              <span className={`${styles['text_572']}`}>无法使用Alexa控制我的设备？</span>
              <span className={`${styles['paragraph_21']}`}>
                请检查:
                <br />
                1.确保您的设备已连接到ZAFRO。如果连接失败，请检查您的设备是否已插入并且您的移动设备是否可以访问互联网。
                <br />
                2.确保您的Alexa已连接到互联网。
                <br />
                3.确保您的ZAFRO账号已授权至Alexa。授权账号后，在ZAFROApp中新添加的设备将自动同步至AlexaApp。如依旧找不到设备，可以尝试重新连接账号至AlexaApp。
                <br />
                4.该设备支持多语言语音命令。请在ZAFROApp内，检查设备的语音指令列表中的可用语言，确保您的AmazonEcho语言在此列表中，并检查AlexaApp中的设备设置里的语言设置
              </span>
              <img
                className={`${styles['image_196']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
            <span className={`${styles['text-group_109']}`}>图文展示</span>
          </div>
          <div className={`${styles['group_251']} flex-col`}>
            <div className={`${styles['section_93']} flex-row`}>
              <span className={`${styles['text_573']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_212']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_213']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_197']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['section_94']} flex-row`}>
              <div className={`${styles['section_95']} flex-col`}>
                <div className={`${styles['image-wrapper_146']} flex-col`}>
                  <img
                    className={`${styles['label_219']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_574']}`}>示例</span>
              <div className={`${styles['section_96']} flex-row`}>
                <div className={`${styles['image-text_132']} flex-row justify-between`}>
                  <div className={`${styles['box_193']} flex-col`}>
                    <div className={`${styles['image-wrapper_147']} flex-col`}>
                      <img
                        className={`${styles['label_220']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_110']}`}>常见问题</span>
                </div>
              </div>
            </div>
            <span className={`${styles['text_575']}`}>如何连接到Alexa？</span>
            <span className={`${styles['paragraph_22']}`}>
              第一步：&nbsp;下载alexa-app，并登录alexa账号
              <br />
              （没有账号需要先注册）
            </span>
            <div className={`${styles['image-text_133']} flex-col justify-between`}>
              <div className={`${styles['group_252']} flex-col`} />
              <span className={`${styles['text-group_111']}`}>
                第二步：运行alexa-app,&nbsp;进入主界面下滑到界
                <br />
                面下方，选择&nbsp;See&nbsp;More
              </span>
            </div>
            <div className={`${styles['image-text_134']} flex-col justify-between`}>
              <div className={`${styles['group_253']} flex-col`} />
              <span className={`${styles['text-group_112']}`}>
                第三步：&nbsp;在Search&nbsp;Alexa&nbsp;Skills中搜索zafro，
                <br />
                点击zafro，在弹出界面点击ENABLE&nbsp;TO&nbsp;USE
              </span>
            </div>
            <div className={`${styles['image-wrapper_148']} flex-col`}>
              <img
                className={`${styles['image_198']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
          </div>
        </div>
        <img
          className={`${styles['image_199']}`}
          src={
            require('./assets/img/SketchPngd1517e70d670964fa3fca6ee7ef40308be24a28a0fc32f9d012815b10f6974d5.png')
          }
        />
        <img
          className={`${styles['image_200']}`}
          src={
            require('./assets/img/SketchPngeeaf2475a8db555330aebe4f235c3a30a0073cd30d5c2f6c59c922e911d760ed.png')
          }
        />
        <img
          className={`${styles['image_201']}`}
          src={
            require('./assets/img/SketchPngdb224d8b53753c78770a0f7fc74c91ee23865f1a5f44881b7030c8e4780734e5.png')
          }
        />
        <img
          className={`${styles['image_202']}`}
          src={
            require('./assets/img/SketchPngb1a2b0ac40ad61d72d580cb3928524c7389b848b520313854cff831d49e62326.png')
          }
        />
        <img
          className={`${styles['image_203']}`}
          src={
            require('./assets/img/SketchPng01e84cdc3dec22fac6b1c93b49f28bc5e9797dd445f685bc9b739966884c8ccd.png')
          }
        />
        <img
          className={`${styles['image_204']}`}
          src={
            require('./assets/img/SketchPng4e33a884846d4aeeeb4d4afd7939aa6126a840c92bb9ff1268a2d9c98e369da3.png')
          }
        />
      </div>
    );
  }
}
export default DDS_lanhupage_0;
