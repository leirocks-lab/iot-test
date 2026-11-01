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
          <div className={`${styles['box_1']} flex-col`}>
            <div className={`${styles['section_2']} flex-row`}>
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
            <div className={`${styles['section_3']} flex-row`}>
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
            <div className={`${styles['section_4']} flex-row`}>
              <div className={`${styles['group_1']} flex-col`} />
            </div>
            <div className={`${styles['section_5']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-col`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPnge9a145dc86a1120570c4db55f59befa582d16a92f814ef85a36279384182373d.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>暂无设备，请添加</span>
              </div>
            </div>
            <img
              className={`${styles['image_3']}`}
              src={
                require('./assets/img/SketchPng7cce72bd552834004134e8d68bc38a770641bce9a2d16518fb883d6df9de473d.png')
              }
            />
          </div>
          <img
            className={`${styles['image_4']}`}
            src={
              require('./assets/img/SketchPngc8bf50ba1cce3232d16f32d77d7ffe01995d97c41568ea344b1a2a9a71edd3fd.png')
            }
          />
        </div>
        <div className={`${styles['section_6']} flex-col`}>
          <div className={`${styles['group_2']} flex-col`}>
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_8']}`}>全屋</span>
              <span className={`${styles['text_9']}`}>4</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-row justify-between`}>
              <span className={`${styles['text_10']}`}>客厅</span>
              <span className={`${styles['text_11']}`}>2</span>
            </div>
            <div className={`${styles['text-wrapper_4']} flex-row justify-between`}>
              <span className={`${styles['text_12']}`}>主卧</span>
              <span className={`${styles['text_13']}`}>1</span>
            </div>
            <div className={`${styles['text-wrapper_5']} flex-row justify-between`}>
              <span className={`${styles['text_14']}`}>次卧</span>
              <span className={`${styles['text_15']}`}>0</span>
            </div>
            <div className={`${styles['text-wrapper_6']} flex-row justify-between`}>
              <span className={`${styles['text_16']}`}>厨房</span>
              <span className={`${styles['text_17']}`}>1</span>
            </div>
            <div className={`${styles['text-wrapper_7']} flex-row`}>
              <span className={`${styles['text_18']}`}>房间管理</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
