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
        <div className={`${styles['group_1']} flex-row`}>
          <div className={`${styles['section_1']} flex-col`}>
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
            <div className={`${styles['section_3']} flex-row justify-between`}>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/a0f7696f315540c28e0f8471bda0f873_mergeImage.png')
                }
              />
              <span className={`${styles['text_6']}`}>&nbsp;找回密码</span>
            </div>
            <div className={`${styles['section_4']} flex-row`}>
              <div className={`${styles['image-text_3']} flex-col`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPng47e4cd1f751e318200768b0459bd36659b1cff7e660f19b8cbfa0f40f3107877.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>请输入新的密码</span>
              </div>
            </div>
            <div className={`${styles['section_5']} flex-row`}>
              <div className={`${styles['box_1']} flex-row`}>
                <div className={`${styles['image-text_4']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2']}`}
                    src={
                      require('./assets/img/SketchPng4d13fd308481531fc141fb4256149d3acfc774600734363b59db40979e36151f.png')
                    }
                  />
                  <span className={`${styles['text-group_2']}`}>请设置您的密码</span>
                </div>
              </div>
            </div>
            <div className={`${styles['section_6']} flex-row`}>
              <div className={`${styles['text-wrapper_1']} flex-col`}>
                <span className={`${styles['text_3']}`}>请再次确认密码</span>
              </div>
            </div>
            <div className={`${styles['section_7']} flex-row`}>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_4']}`}>下一步</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_4']} flex-row`}>
              <span className={`${styles['text_5']}`}>忘记账号</span>
            </div>
          </div>
          <img
            className={`${styles['image_4']}`}
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
