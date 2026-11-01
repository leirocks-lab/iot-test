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
        <div className={`${styles['group_2']} flex-row`}>
          <img
            className={`${styles['image_4']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['block_4']} flex-col`}>
            <div className={`${styles['group_3']} flex-row`}>
              <span className={`${styles['text_10']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_5']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_6']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_5']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['image-text_3']} flex-row justify-between`}>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/9038bd0d486b4f6e84715cc6f2d3f5a0_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_3']} flex-row`}>
                <span className={`${styles['text_11']}`}>示例</span>
                <span className={`${styles['text_12']}`}>个人信息</span>
              </div>
            </div>
            <div className={`${styles['list_2']} flex-col`}>
              <div className={`${styles['list-items_1-0']} flex-row`}>
                <span className={`${styles['text_4-0']}`}>昵称</span>
                <div className={`${styles['image-text_4-0']} flex-row justify-between`}>
                  <span className={`${styles['text-group_2-0']}`}>Antarctic&nbsp;Star</span>
                  <img
                    className={`${styles['thumbnail_4-0']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['list-items_1-1']} flex-row`}>
                <span className={`${styles['text_4-1']}`}>邮箱</span>
                <div className={`${styles['image-text_4-1']} flex-row justify-between`}>
                  <span className={`${styles['text-group_2-1']}`}>18520233229&#64;gmail.com</span>
                  <img
                    className={`${styles['thumbnail_4-1']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['list-items_1-2']} flex-row`}>
                <span className={`${styles['text_4-2']}`}>修改密码</span>
                <img
                  className={`${styles['thumbnail_3-2']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_5']}`}>注销账号</span>
            </div>
            <img
              className={`${styles['image_3']}`}
              src={
                require('./assets/img/SketchPngba6169b6170becce0910bf8fbc91b9947fe4b5ebfa041f3e0b3020c8e9c231ea.png')
              }
            />
          </div>
        </div>
        <div className={`${styles['box_2']} flex-col`}>
          <div className={`${styles['block_2']} flex-col`}>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_6']}`}>修改昵称</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_7']}`}>Antarctic&nbsp;Star</span>
            </div>
            <div className={`${styles['block_3']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_8']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_5']} flex-col`}>
                <span className={`${styles['text_9']}`}>确定</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
