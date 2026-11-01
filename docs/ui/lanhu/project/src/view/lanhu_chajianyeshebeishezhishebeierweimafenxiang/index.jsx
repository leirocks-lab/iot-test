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
        <div className={`${styles['section_1']} flex-col`}>
          <div className={`${styles['group_5']} flex-col`}>
            <div className={`${styles['group_6']} flex-row`}>
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
            <div className={`${styles['group_7']} flex-row justify-between`}>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPngc8fd641a50d088563b0f84ac603b9d796243ed99057556d3c5f2f54cb8a6ef92.png')
                }
              />
              <span className={`${styles['text_2']}`}>设备分享</span>
            </div>
          </div>
          <div className={`${styles['group_4']} flex-col`}>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng6d899498f3c841aeb41803a69bf2e9a00d8102ef5895e5c2efabe1afd17fb0fb.png')
              }
            />
            <span className={`${styles['text_5']}`}>15分钟内有效</span>
            <span className={`${styles['text_6']}`}>扫描上方二维码图案，加入家庭成员</span>
          </div>
          <img
            className={`${styles['image_3']}`}
            src={
              require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
