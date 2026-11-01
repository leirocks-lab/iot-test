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
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['section_2']} flex-col`}>
            <div className={`${styles['block_1']} flex-row`}>
              <span className={`${styles['text_1']}`}>9:28</span>
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
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/SketchPng681720f3f9a93eed9ce71fd2b420333890128aa3e8d8afede991398102280231.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>示例</span>
                <span className={`${styles['text_3']}`}>我要反馈</span>
              </div>
            </div>
            <div className={`${styles['block_2']} flex-row justify-between`}>
              <div className={`${styles['image-text_2']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_1']} flex-col`}>
                  <img
                    className={`${styles['label_2']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_2']}`}>Air&nbsp;Conditioner</span>
              </div>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['block_3']} flex-row justify-between`}>
              <span className={`${styles['text_4']}`}>问题类型</span>
              <img
                className={`${styles['thumbnail_4']}`}
                src={
                  require('./assets/img/SketchPng98574be014202a152ec5de449e82004b5d1590e3e66bb76ac5d58d84db48bcf7.png')
                }
              />
            </div>
            <div className={`${styles['block_4']} flex-col`} />
          </div>
        </div>
        <div className={`${styles['section_3']} flex-col`}>
          <div className={`${styles['block_5']} flex-col`}>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_5']}`}>选择产品的问题类型</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_6']}`}>APP问题</span>
            </div>
            <div className={`${styles['block_6']} flex-row justify-between`}>
              <span className={`${styles['text_7']}`}>设备问题</span>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_8']}`}>服务问题</span>
            </div>
            <div className={`${styles['text-wrapper_4']} flex-col`}>
              <span className={`${styles['text_9']}`}>订单问题</span>
            </div>
            <div className={`${styles['text-wrapper_5']} flex-col`}>
              <span className={`${styles['text_10']}`}>其他</span>
            </div>
            <div className={`${styles['block_7']} flex-col`} />
            <div className={`${styles['block_8']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_6']} flex-col`}>
                <span className={`${styles['text_11']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_7']} flex-col`}>
                <span className={`${styles['text_12']}`}>确定</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
