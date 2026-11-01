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
          <div className={`${styles['box_2']} flex-col`}>
            <div className={`${styles['box_3']} flex-row`}>
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
            <div className={`${styles['image-wrapper_1']} flex-row`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/439c58c8048241b29f78469c05d81a32_mergeImage.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_1']} flex-row`}>
              <span className={`${styles['text_2']}`}>登录</span>
            </div>
            <div className={`${styles['box_4']} flex-row`}>
              <div className={`${styles['box_5']} flex-row`}>
                <div className={`${styles['image-text_1']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2']}`}
                    src={
                      require('./assets/img/SketchPng1a10c20eafcd764d76fa8f10da58f8799b36f13dd62fbe237a60ae103980858c.png')
                    }
                  />
                  <span className={`${styles['text-group_1']}`}>请输入您的邮箱账号</span>
                </div>
              </div>
            </div>
            <div className={`${styles['box_6']} flex-row`}>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_3']}`}>请输入您的密码</span>
              </div>
            </div>
            <div className={`${styles['box_7']} flex-row justify-between`}>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng4b19373a8d47de67eaa30abef7bbb27500ebd3b466311cd0967743023982080b.png')
                }
              />
              <div className={`${styles['text-wrapper_3']}`}>
                <span className={`${styles['text_4']}`}>阅读并同意</span>
                <span className={`${styles['text_5']}`}>隐私政策</span>
                <span className={`${styles['text_6']}`}>&nbsp;与</span>
                <span className={`${styles['text_7']}`}>用户协议</span>
              </div>
            </div>
            <div className={`${styles['box_8']} flex-row`}>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_8']}`}>登录</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_5']} flex-row`}>
              <span className={`${styles['text_9']}`}>忘记密码</span>
            </div>
            <div className={`${styles['text-wrapper_6']} flex-row`}>
              <span className={`${styles['text_10']}`}>忘记密码</span>
            </div>
            <div className={`${styles['text-wrapper_7']} flex-col`}>
              <span className={`${styles['text_11']}`}>新密码设置成功</span>
            </div>
          </div>
          <img
            className={`${styles['image_2']}`}
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
