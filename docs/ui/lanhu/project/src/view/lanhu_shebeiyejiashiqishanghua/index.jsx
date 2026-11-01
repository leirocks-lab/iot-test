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
        <img
          className={`${styles['image_1']}`}
          src={
            require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
          }
        />
        <div className={`${styles['box_1']} flex-col`}>
          <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
            <span className={`${styles['text_1']}`}>40</span>
            <span className={`${styles['text_2']}`}>32</span>
            <span className={`${styles['text_3']}`}>30</span>
          </div>
          <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
            <span className={`${styles['text_4']}`}>%</span>
            <span className={`${styles['text_5']}`}>%</span>
            <span className={`${styles['text_6']}`}>%</span>
          </div>
          <div className={`${styles['text-wrapper_3']} flex-row justify-between`}>
            <span className={`${styles['text_7']}`}>目标湿度</span>
            <span className={`${styles['text_8']}`}>当前湿度</span>
            <span className={`${styles['text_9']}`}>室外湿度</span>
          </div>
          <img
            className={`${styles['label_1']}`}
            src={
              require('./assets/img/SketchPngc223818979f6181347b55858a29b68365d47ebababd8d834021fd26776b8ba64.png')
            }
          />
          <div className={`${styles['list_1']} flex-col`}>
            <div className={`${styles['list-items_1-0']} flex-col`}>
              <div className={`${styles['text-wrapper_4-0']} flex-row`}>
                <span className={`${styles['text_10-0']}`}>雾量</span>
              </div>
              <div className={`${styles['box_2-0']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_5-0']} flex-col`}>
                  <span className={`${styles['text_11-0']}`}>恒湿</span>
                </div>
                <div className={`${styles['text-wrapper_6-0']} flex-col`}>
                  <span className={`${styles['text_12-0']}`}>1档</span>
                </div>
                <div className={`${styles['text-wrapper_7-0']} flex-col`}>
                  <span className={`${styles['text_13-0']}`}>2档</span>
                </div>
                <div className={`${styles['text-wrapper_8-0']} flex-col`}>
                  <span className={`${styles['text_14-0']}`}>3档</span>
                </div>
              </div>
            </div>
            <div className={`${styles['list-items_1-1']} flex-col`}>
              <div className={`${styles['text-wrapper_4-1']} flex-row`}>
                <span className={`${styles['text_10-1']}`}>风速</span>
              </div>
              <div className={`${styles['box_2-1']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_5-1']} flex-col`}>
                  <span className={`${styles['text_11-1']}`}>静音</span>
                </div>
                <div className={`${styles['text-wrapper_6-1']} flex-col`}>
                  <span className={`${styles['text_12-1']}`}>低档</span>
                </div>
                <div className={`${styles['text-wrapper_7-1']} flex-col`}>
                  <span className={`${styles['text_13-1']}`}>中档</span>
                </div>
                <div className={`${styles['text-wrapper_8-1']} flex-col`}>
                  <span className={`${styles['text_14-1']}`}>高档</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['group_1']} flex-col`}>
            <span className={`${styles['text_15']}`}>灯光</span>
            <div className={`${styles['list_2']} flex-row`}>
              <div className={`${styles['text-wrapper_9-0']} flex-col`}>
                <span className={`${styles['text_16-0']}`}>全灯</span>
              </div>
              <div className={`${styles['text-wrapper_9-1']} flex-col`}>
                <span className={`${styles['text_16-1']}`}>屏幕</span>
              </div>
              <div className={`${styles['text-wrapper_9-2']} flex-col`}>
                <span className={`${styles['text_16-2']}`}>氛围灯</span>
              </div>
            </div>
          </div>
          <div className={`${styles['group_2']} flex-row justify-between`}>
            <div className={`${styles['group_3']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <div className={`${styles['text-group_1']} flex-col`}>
                  <span className={`${styles['text_17']}`}>夜间勿扰</span>
                  <span className={`${styles['text_18']}`}>无蜂鸣及灯光</span>
                </div>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPngec6e26f0f53aa34871faeae7f46bd9d6190402e583500bec03929122b472ddb9.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <div className={`${styles['text-group_2']} flex-col`}>
                <span className={`${styles['text_19']}`}>净离子</span>
                <span className={`${styles['text_20']}`}>强化杀菌</span>
              </div>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['group_5']} flex-row`}>
            <div className={`${styles['group_6']} flex-col`}>
              <div className={`${styles['text-wrapper_10']} flex-row justify-between`}>
                <span className={`${styles['text_21']}`}>2</span>
                <span className={`${styles['text_22']}`}>天</span>
              </div>
              <span className={`${styles['text_23']}`}>小美已陪伴</span>
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng4229b24e5c2afaea178066a3982359a3d5b94fa01e057de8b61da769091f8cf8.png')
              }
            />
            <div className={`${styles['group_7']} flex-col`}>
              <div className={`${styles['text-wrapper_11']} flex-row justify-between`}>
                <span className={`${styles['text_24']}`}>2.5</span>
                <span className={`${styles['text_25']}`}>小时</span>
              </div>
              <span className={`${styles['text_26']}`}>运行时长</span>
            </div>
          </div>
          <div className={`${styles['group_8']} flex-col`}>
            <span className={`${styles['text_27']}`}>湿度</span>
            <div className={`${styles['box_3']} flex-col`}>
              <div className={`${styles['group_9']} flex-col`}>
                <div className={`${styles['group_10']} flex-col`} />
              </div>
            </div>
            <div className={`${styles['text-wrapper_12']} flex-row justify-between`}>
              <span className={`${styles['text_28']}`}>40%</span>
              <span className={`${styles['text_29']}`}>45%</span>
              <span className={`${styles['text_30']}`}>50%</span>
              <span className={`${styles['text_31']}`}>55%</span>
              <span className={`${styles['text_32']}`}>60%</span>
              <span className={`${styles['text_33']}`}>F%</span>
            </div>
          </div>
          <div className={`${styles['group_11']} flex-col`}>
            <div className={`${styles['group_12']} flex-row`}>
              <span className={`${styles['text_34']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_1']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_2']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_3']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['group_13']} flex-row`}>
              <div className={`${styles['image-text_2']} flex-row justify-between`}>
                <img
                  className={`${styles['label_4']}`}
                  src={
                    require('./assets/img/620a68ec072c46ca8a9fd59b14fd676d_mergeImage.png')
                  }
                />
                <span className={`${styles['text-group_3']}`}>Humidifier</span>
              </div>
            </div>
          </div>
          <div className={`${styles['group_14']} flex-row justify-between`}>
            <div className={`${styles['image-text_3']} flex-row justify-between`}>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng5b531527afaa4b3efd7268f71800b747e03493fad5d5d57aaa574df641ad793e.png')
                }
              />
              <span className={`${styles['text-group_4']}`}>已使用&nbsp;215小时，注意清洁机器</span>
            </div>
            <img
              className={`${styles['thumbnail_4']}`}
              src={
                require('./assets/img/SketchPngb4c06a58a484033cb7d2ffd64aadaa7cff9bdb3ab9a8536363abd1f8cb72edc8.png')
              }
            />
          </div>
          <div className={`${styles['group_15']} flex-col`}>
            <div className={`${styles['list_3']} flex-row`}>
              <div className={`${styles['image-text_4-0']} flex-col`}>
                <img
                  className={`${styles['label_5-0']}`}
                  src={
                    require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                  }
                />
                <span className={`${styles['text-group_5-0']}`}>开关</span>
              </div>
              <div className={`${styles['image-text_4-1']} flex-col`}>
                <img
                  className={`${styles['label_5-1']}`}
                  src={
                    require('./assets/img/SketchPng1a9ce8d0f73e00890a08f6266bda5ca83249b65335fce3822d855af1acc7c7c7.png')
                  }
                />
                <span className={`${styles['text-group_5-1']}`}>定时</span>
              </div>
            </div>
            <img
              className={`${styles['image_4']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
