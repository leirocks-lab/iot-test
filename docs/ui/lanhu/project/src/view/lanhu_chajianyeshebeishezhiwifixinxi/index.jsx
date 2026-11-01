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
        <div className={`${styles['box_1']} flex-col`}>
          <div className={`${styles['block_1']} flex-col`}>
            <div className={`${styles['box_2']} flex-col`}>
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
                  className={`${styles['image_1']}`}
                  src={
                    require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                  }
                />
              </div>
              <div className={`${styles['section_2']} flex-row justify-between`}>
                <img
                  className={`${styles['thumbnail_3']}`}
                  src={
                    require('./assets/img/SketchPngc8fd641a50d088563b0f84ac603b9d796243ed99057556d3c5f2f54cb8a6ef92.png')
                  }
                />
                <span className={`${styles['text_2']}`}>Wi-Fi信息</span>
              </div>
              <div className={`${styles['text-wrapper_1']} flex-row`}>
                <span className={`${styles['text_3']}`}>SN</span>
                <span className={`${styles['text_4']}`}>498498</span>
                <span className={`${styles['text_5']}`}>复制</span>
              </div>
              <div className={`${styles['list_1']} flex-col`}>
                <div className={`${styles['text-wrapper_2-0']} flex-row justify-between`}>
                  <span className={`${styles['text_6-0']}`}>MAC</span>
                  <span className={`${styles['text_7-0']}`}>00-16-EA-AE-3C-40</span>
                </div>
                <div className={`${styles['text-wrapper_2-1']} flex-row justify-between`}>
                  <span className={`${styles['text_6-1']}`}>Wi-Fi</span>
                  <span className={`${styles['text_7-1']}`}>强</span>
                </div>
                <div className={`${styles['text-wrapper_2-2']} flex-row justify-between`}>
                  <span className={`${styles['text_6-2']}`}>信号强度</span>
                  <span className={`${styles['text_7-2']}`}>45</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_8']}`}>复制成功</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
