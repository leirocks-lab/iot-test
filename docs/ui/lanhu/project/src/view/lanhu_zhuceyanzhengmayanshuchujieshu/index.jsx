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
          <div className={`${styles['box_1']} flex-col`}>
            <div className={`${styles['block_3']} flex-row`}>
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
            <div className={`${styles['block_4']} flex-row justify-between`}>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/ab3b65f7556b4db2a1212f54063d4244_mergeImage.png')
                }
              />
              <span className={`${styles['text_11']}`}>&nbsp;邮箱验证</span>
            </div>
            <div className={`${styles['block_5']} flex-row`}>
              <div className={`${styles['image-text_2']} flex-col`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPnga7a867d35cb3993c2f89a8549fbce76df10c3ac647bc391c3697f064b1a5d893.png')
                  }
                />
                <div className={`${styles['text-group_1']}`}>
                  <span className={`${styles['paragraph_1']}`}>
                    验证码已发送到您的邮箱
                    <br />
                  </span>
                  <span className={`${styles['text_3']}`}>599054675&#64;qq.com</span>
                  <span className={`${styles['text_4']}`}>&nbsp;请输入验证码进行验证</span>
                </div>
              </div>
            </div>
            <div className={`${styles['block_6']} flex-row`}>
              <div className={`${styles['list_2']} flex-row`}>
                <div className={`${styles['text-wrapper_1-0']} flex-col`}>
                  <span className={`${styles['text_5-0']}`}>5</span>
                </div>
                <div className={`${styles['text-wrapper_1-1']} flex-col`}>
                  <span className={`${styles['text_5-1']}`}>7</span>
                </div>
                <div className={`${styles['text-wrapper_1-2']} flex-col`}>
                  <span className={`${styles['text_5-2']}`}>0</span>
                </div>
                <div className={`${styles['text-wrapper_1-3']} flex-col`}>
                  <span className={`${styles['text_5-3']}`}>0</span>
                </div>
                <div className={`${styles['text-wrapper_1-4']} flex-col`}>
                  <span className={`${styles['text_5-4']}`}>2</span>
                </div>
                <div className={`${styles['text-wrapper_1-5']} flex-col`}>
                  <span className={`${styles['text_5-5']}`}>3</span>
                </div>
              </div>
            </div>
            <div className={`${styles['block_7']} flex-row`}>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_6']}`}>确认</span>
              </div>
            </div>
            <div className={`${styles['block_8']} flex-row`}>
              <div className={`${styles['text-wrapper_3']}`}>
                <span className={`${styles['text_7']}`}>没收到验证码？</span>
                <span className={`${styles['text_8']}`}>40S</span>
                <span className={`${styles['text_9']}`}></span>
                <span className={`${styles['text_10']}`}>重新发送</span>
              </div>
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
