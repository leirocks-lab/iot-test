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
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['group_1']} flex-col`}>
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
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['block_2']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/SketchPng681720f3f9a93eed9ce71fd2b420333890128aa3e8d8afede991398102280231.png')
                  }
                />
                <div className={`${styles['text-group_1']} flex-row`}>
                  <span className={`${styles['text_2']}`}>示例</span>
                  <span className={`${styles['text_3']}`}>我要反馈</span>
                </div>
              </div>
            </div>
            <div className={`${styles['block_3']} flex-row`}>
              <div className={`${styles['image-text_2']} flex-col`}>
                <img
                  className={`${styles['image_3']}`}
                  src={
                    require('./assets/img/SketchPng669b7fa9977d3896b5989e343fcaf791d855a146c8f25b941c4c8a554a511ec8.png')
                  }
                />
                <div className={`${styles['text-group_2']} flex-col`}>
                  <span className={`${styles['text_4']}`}>反馈成功</span>
                  <span className={`${styles['text_5']}`}>我们预计在1-3个工作日内回复</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
