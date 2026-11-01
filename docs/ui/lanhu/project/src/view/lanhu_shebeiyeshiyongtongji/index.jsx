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
          <div className={`${styles['box_2']} flex-col`}>
            <div className={`${styles['box_3']} flex-col`}>
              <div className={`${styles['box_4']} flex-row`}>
                <span className={`${styles['text_22']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_5']}`}
                  src={
                    require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_6']}`}
                  src={
                    require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                  }
                />
                <img
                  className={`${styles['image_8']}`}
                  src={
                    require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                  }
                />
              </div>
              <div className={`${styles['box_5']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/SketchPng681720f3f9a93eed9ce71fd2b420333890128aa3e8d8afede991398102280231.png')
                  }
                />
                <span className={`${styles['text_2']}`}>使用统计</span>
              </div>
              <div className={`${styles['box_6']} flex-row`}>
                <div className={`${styles['block_1']} flex-row justify-between`}>
                  <div className={`${styles['text-wrapper_1']} flex-col`}>
                    <span className={`${styles['text_3']}`}>日</span>
                  </div>
                  <span className={`${styles['text_4']}`}>周</span>
                </div>
              </div>
            </div>
            <div className={`${styles['group_2']} flex-col`}>
              <div className={`${styles['group_6']} flex-row justify-between`}>
                <img
                  className={`${styles['thumbnail_3']}`}
                  src={
                    require('./assets/img/SketchPng51edad60c87f8fa1c9c444cb3c0fb44f044ffb509a275cad6dadc622e5c1a46c.png')
                  }
                />
                <span className={`${styles['text_5']}`}>8月15日</span>
                <img
                  className={`${styles['thumbnail_4']}`}
                  src={
                    require('./assets/img/SketchPng137d5add9896aef6d3fddde87f4e9895f16013b4498331725c21bfb331df3cb0.png')
                  }
                />
              </div>
              <div className={`${styles['text-wrapper_5']} flex-row justify-between`}>
                <span className={`${styles['text_6']}`}>0</span>
                <span className={`${styles['text_7']}`}>分钟</span>
              </div>
              <span className={`${styles['text_8']}`}>使用时长</span>
              <span className={`${styles['text_9']}`}>60</span>
              <span className={`${styles['text_10']}`}>30</span>
              <img
                className={`${styles['image_6']}`}
                src={
                  require('./assets/img/SketchPngbd062e8312dac64af1f78cc4c3f283fd08894cbe3a7b903dbfab6198a1fe7041.png')
                }
              />
              <div className={`${styles['text-wrapper_6']} flex-row justify-between`}>
                <span className={`${styles['text_11']}`}>00</span>
                <span className={`${styles['text_12']}`}>06</span>
                <span className={`${styles['text_13']}`}>12</span>
                <span className={`${styles['text_14']}`}>18</span>
                <span className={`${styles['text_15']}`}>24</span>
              </div>
            </div>
            <img
              className={`${styles['image_9']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
