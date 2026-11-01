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
          <div className={`${styles['group_1']} flex-col`}>
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
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['section_2']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/b8778b800a724f03824f73b06eeeb4a3_mergeImage.png')
                  }
                />
                <div className={`${styles['text-group_1']} flex-row`}>
                  <span className={`${styles['text_2']}`}>示例</span>
                  <span className={`${styles['text_3']}`}>修改密码</span>
                </div>
              </div>
            </div>
            <div className={`${styles['section_3']} flex-row`}>
              <div className={`${styles['image-text_2']} flex-col`}>
                <img
                  className={`${styles['image_3']}`}
                  src={
                    require('./assets/img/SketchPng47e4cd1f751e318200768b0459bd36659b1cff7e660f19b8cbfa0f40f3107877.png')
                  }
                />
                <span className={`${styles['text-group_2']}`}>旧密码</span>
              </div>
            </div>
            <div className={`${styles['section_4']} flex-row`}>
              <div className={`${styles['box_2']} flex-row`}>
                <div className={`${styles['image-text_3']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2']}`}
                    src={
                      require('./assets/img/SketchPng4d13fd308481531fc141fb4256149d3acfc774600734363b59db40979e36151f.png')
                    }
                  />
                  <span className={`${styles['text-group_3']}`}>请输入您现在的密码</span>
                </div>
              </div>
            </div>
            <div className={`${styles['section_5']} flex-row`}>
              <div className={`${styles['text-wrapper_1']} flex-col`}>
                <span className={`${styles['text_4']}`}>下一步</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
