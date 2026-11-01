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
        <div className={`${styles['block_1']} flex-row`}>
          <div className={`${styles['group_1']} flex-col`}>
            <div className={`${styles['group_2']} flex-row`}>
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
            <div className={`${styles['group_3']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/4e54cc6bfe2d4b07b1868f19871c843a_mergeImage.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>添加设备</span>
              </div>
            </div>
            <div className={`${styles['image-wrapper_1']} flex-row`}>
              <img
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPng8131615878c0e1facd52b98ba27ad1ad1e627845f07ec94cc078919e9aa37c9e.png')
                }
              />
            </div>
            <div className={`${styles['group_4']} flex-row`}>
              <div className={`${styles['text-group_2']} flex-col`}>
                <span className={`${styles['text_2']}`}>正在扫描附近蓝牙设备</span>
                <span className={`${styles['text_3']}`}>请保持设备已接通电源，并在附近</span>
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_3']}`}
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
