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
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['section_1']} flex-col`}>
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
                  require('./assets/img/18bf149e2109461fa59a5eee2e97edee_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>示例</span>
                <span className={`${styles['text_3']}`}>语言</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_4']}`}>跟随系统（当前）</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_5']}`}>简体中文</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_6']}`}>English</span>
            </div>
            <div className={`${styles['text-wrapper_4']} flex-col`}>
              <span className={`${styles['text_7']}`}>Deutsch</span>
            </div>
            <div className={`${styles['text-wrapper_5']} flex-col`}>
              <span className={`${styles['text_8']}`}>Français</span>
            </div>
            <div className={`${styles['text-wrapper_6']} flex-col`}>
              <span className={`${styles['text_9']}`}>Español</span>
            </div>
            <div className={`${styles['text-wrapper_7']} flex-col`}>
              <span className={`${styles['text_10']}`}>Italiano</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
