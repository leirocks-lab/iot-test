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
        <div className={`${styles['box_1']} flex-row`}>
          <div className={`${styles['block_1']} flex-col`}>
            <div className={`${styles['box_2']} flex-row`}>
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
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/6b540e7e42864ba38d39483a1f74b621_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_1']}`}>添加设备</span>
            </div>
            <div className={`${styles['list_1']} flex-col`}>
              <div className={`${styles['image-text_2-0']} flex-row`}>
                <div className={`${styles['group_1-0']} flex-col`}>
                  <img
                    className={`${styles['image_2-0']}`}
                    src={
                      require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                    }
                  />
                  <div className={`${styles['group_2-0']} flex-col`} />
                </div>
                <div className={`${styles['text-group_3-0']} flex-col`}>
                  <span className={`${styles['text_5-0']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_6-0']}`}>RW-400PRO</span>
                  <span className={`${styles['text_7-0']}`}>SN.:&nbsp;R26073100012607310001</span>
                </div>
              </div>
              <div className={`${styles['image-text_2-1']} flex-row`}>
                <div className={`${styles['group_1-1']} flex-col`}>
                  <img
                    className={`${styles['image_2-1']}`}
                    src={
                      require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                    }
                  />
                  <div className={`${styles['group_2-1']} flex-col`} />
                </div>
                <div className={`${styles['text-group_2-1']} flex-col`}>
                  <span className={`${styles['text_2-1']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_3-1']}`}>RW-400PRO</span>
                  <span className={`${styles['text_4-1']}`}>MAC.:&nbsp;R26073100012607310001</span>
                </div>
                <div className={`${styles['group_3-1']} flex-col`}>
                  <div className={`${styles['section_1-1']} flex-col`} />
                  <img
                    className={`${styles['image_3-1']}`}
                    src={
                      require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['text-group_4']} flex-col`}>
              <div className={`${styles['text-wrapper_1']}`}>
                <span className={`${styles['text_8']}`}>发现设备</span>
                <span className={`${styles['text_9']}`}>2</span>
              </div>
              <span className={`${styles['text_10']}`}>请保持设备已接通电源，并在附近</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_11']}`}>重新扫描</span>
            </div>
          </div>
          <img
            className={`${styles['image_4']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
