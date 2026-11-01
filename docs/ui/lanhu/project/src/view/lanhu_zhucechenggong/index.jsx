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
        <div className={`${styles['group_1']} flex-col`}>
          <div className={`${styles['section_1']} flex-col`}>
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
          </div>
          <div className={`${styles['section_2']} flex-col`}>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPngf1933e49f10953618b6d548590f09742e04da4671b6bfcd8041f8ef74441e37d.png')
              }
            />
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_2']}`}>注册成功</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_3']}`}>登录</span>
            </div>
          </div>
          <div className={`${styles['section_3']} flex-col`}>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_4']}`}>注册</span>
            </div>
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
