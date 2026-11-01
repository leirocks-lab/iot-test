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
        <div className={`${styles['group_1']} flex-row`}>
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['box_1']} flex-col`}>
            <div className={`${styles['section_1']} flex-row`}>
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
                  require('./assets/img/179c78c9d8d04f8783e73cbd5190f885_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>示例</span>
                <span className={`${styles['text_3']}`}>联系我们</span>
              </div>
            </div>
            <div className={`${styles['section_2']} flex-row`}>
              <div className={`${styles['image-text_2']} flex-row justify-between`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng1a10c20eafcd764d76fa8f10da58f8799b36f13dd62fbe237a60ae103980858c.png')
                  }
                />
                <div className={`${styles['text-group_2']} flex-col`}>
                  <span className={`${styles['text_4']}`}>官方邮箱</span>
                  <span className={`${styles['text_5']}`}>aftersale&#64;zafroshop.com</span>
                </div>
              </div>
              <span className={`${styles['text_6']}`}>复制</span>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
          </div>
        </div>
        <div className={`${styles['group_2']} flex-col`}>
          <div className={`${styles['block_1']} flex-col`}>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_7']}`}>打开邮箱</span>
            </div>
            <div className={`${styles['group_3']} flex-row`}>
              <div className={`${styles['section_3']} flex-row`}>
                <div className={`${styles['image-text_3']} flex-col`}>
                  <div className={`${styles['section_4']} flex-col`} />
                  <span className={`${styles['text-group_3']}`}>Gmail</span>
                </div>
              </div>
              <div className={`${styles['image-text_4']} flex-col`}>
                <div className={`${styles['section_5']} flex-col`} />
                <span className={`${styles['text-group_4']}`}>Mail</span>
              </div>
              <span className={`${styles['text_8']}`}>功能</span>
              <span className={`${styles['text_9']}`}>功能</span>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_10']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_11']}`}>确定</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
