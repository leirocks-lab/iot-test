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
        <div className={`${styles['box_2']} flex-row justify-between`}>
          <img
            className={`${styles['label_1']}`}
            src={
              require('./assets/img/4410ce94a7fd4544a6612f7fdce128fe_mergeImage.png')
            }
          />
          <span className={`${styles['text_2']}`}>添加设备</span>
          <span className={`${styles['text_3']}`}>添加设备</span>
        </div>
        <div className={`${styles['box_3']} flex-row justify-between`}>
          <span className={`${styles['text_4']}`}>设备昵称</span>
          <div className={`${styles['text-wrapper_1']}`}>
            <span className={`${styles['text_5']}`}>4</span>
            <span className={`${styles['text_6']}`}>/20</span>
          </div>
        </div>
        <div className={`${styles['text-wrapper_2']} flex-col`}>
          <span className={`${styles['text_7']}`}>台面风扇</span>
        </div>
        <span className={`${styles['text_8']}`}>默认设备类型，可在此修改并设置设备名称</span>
        <div className={`${styles['box_4']} flex-row justify-between`}>
          <div className={`${styles['text-wrapper_3']} flex-col`}>
            <span className={`${styles['text_9']}`}>不设置，跳过</span>
          </div>
          <div className={`${styles['group_1']} flex-col`} />
          <span className={`${styles['text_10']}`}>完成</span>
        </div>
        <div className={`${styles['box_5']} flex-col`}>
          <div className={`${styles['text-wrapper_4']} flex-col`}>
            <span className={`${styles['text_11']}`}>使用场景</span>
          </div>
          <div className={`${styles['box_6']} flex-col`}>
            <div className={`${styles['section_1']} flex-col`}>
              <div className={`${styles['box_7']} flex-row justify-between`}>
                <span className={`${styles['text_12']}`}>客厅</span>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                  }
                />
              </div>
              <div className={`${styles['text-wrapper_5']} flex-col`}>
                <span className={`${styles['text_13']}`}>主卧</span>
              </div>
              <div className={`${styles['text-wrapper_6']} flex-col`}>
                <span className={`${styles['text_14']}`}>次卧</span>
              </div>
              <div className={`${styles['text-wrapper_7']} flex-col`}>
                <span className={`${styles['text_15']}`}>厨房</span>
              </div>
              <div className={`${styles['text-wrapper_8']} flex-col`}>
                <span className={`${styles['text_16']}`}>浴室</span>
              </div>
            </div>
          </div>
          <div className={`${styles['box_8']} flex-col`} />
          <div className={`${styles['box_9']} flex-col`}>
            <div className={`${styles['box_10']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_9']} flex-col`}>
                <span className={`${styles['text_17']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_10']} flex-col`}>
                <span className={`${styles['text_18']}`}>确定</span>
              </div>
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
              }
            />
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
