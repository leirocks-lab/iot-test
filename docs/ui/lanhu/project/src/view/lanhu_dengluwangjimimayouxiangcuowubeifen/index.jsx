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
          <div className={`${styles['group_2']} flex-col`}>
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
            <div className={`${styles['block_2']} flex-row justify-between`}>
              <img
                className={`${styles['label_5']}`}
                src={
                  require('./assets/img/6905c405d0e642c19978f90d74fbf04e_mergeImage.png')
                }
              />
              <span className={`${styles['text_6']}`}>&nbsp;找回密码</span>
            </div>
            <div className={`${styles['block_3']} flex-row`}>
              <div className={`${styles['image-text_3']} flex-col`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPng47e4cd1f751e318200768b0459bd36659b1cff7e660f19b8cbfa0f40f3107877.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>通过邮箱找回</span>
              </div>
            </div>
            <div className={`${styles['block_4']} flex-row`}>
              <div className={`${styles['box_2']} flex-row justify-between`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng1a10c20eafcd764d76fa8f10da58f8799b36f13dd62fbe237a60ae103980858c.png')
                  }
                />
                <span className={`${styles['text_3']}`}>请输入您的邮箱账号</span>
                <div className={`${styles['box_3']} flex-row justify-between`}>
                  <div className={`${styles['image-text_4']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/SketchPng1a10c20eafcd764d76fa8f10da58f8799b36f13dd62fbe237a60ae103980858c.png')
                      }
                    />
                    <span className={`${styles['text-group_2']}`}>599054675&#64;qq.com</span>
                  </div>
                  <img
                    className={`${styles['label_4']}`}
                    src={
                      require('./assets/img/SketchPng757c641c47da43cad990948c8f352852188f4b43b542cfc5496062fe733483a7.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['block_5']} flex-row`}>
              <div className={`${styles['text-wrapper_1']} flex-col`}>
                <span className={`${styles['text_4']}`}>下一步</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-row`}>
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
