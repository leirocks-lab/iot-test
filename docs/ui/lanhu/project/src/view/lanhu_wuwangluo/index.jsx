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
          <div className={`${styles['box_1']} flex-col`}>
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
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_1']} flex-row`}>
              <span className={`${styles['text_2']}`}>示例</span>
            </div>
            <div className={`${styles['block_2']} flex-row`}>
              <span className={`${styles['text_3']}`}>全屋</span>
              <span className={`${styles['text_4']}`}>客厅</span>
              <span className={`${styles['text_5']}`}>主卧</span>
              <span className={`${styles['text_6']}`}>次卧</span>
              <span className={`${styles['text_7']}`}>厨房</span>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/SketchPng847c8c16e4c458debc793faa2423a2b901049d6c12a7a58daf03c687c00a7ed2.png')
                }
              />
            </div>
            <div className={`${styles['block_3']} flex-row`}>
              <div className={`${styles['box_2']} flex-col`} />
            </div>
            <div className={`${styles['block_4']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-col`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPng65d8447eed58d633f26b7405ecc172fb1f689529104169eeebefa9a23c44293e.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>网络已断开</span>
              </div>
            </div>
            <div className={`${styles['block_5']} flex-row`}>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_8']}`}>重新连接</span>
              </div>
            </div>
            <img
              className={`${styles['image_3']}`}
              src={
                require('./assets/img/SketchPng7cce72bd552834004134e8d68bc38a770641bce9a2d16518fb883d6df9de473d.png')
              }
            />
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_9']}`}>重新连接</span>
            </div>
          </div>
          <img
            className={`${styles['image_4']}`}
            src={
              require('./assets/img/SketchPng8357b06cc2377b3bb955b7600ac540b06752c1d6404451eacf5e1f8ac6598f03.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
