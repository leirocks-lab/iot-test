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
          <div className={`${styles['box_1']} flex-col`}>
            <div className={`${styles['group_1']} flex-row`}>
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
            <div className={`${styles['group_2']} flex-row`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/3a090c0ecace431691961a924c44f107_mergeImage.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>添加设备</span>
              </div>
            </div>
            <div className={`${styles['group_3']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
                <span className={`${styles['text_2']}`}>45</span>
                <span className={`${styles['text_3']}`}>%</span>
              </div>
              <span className={`${styles['text_4']}`}>请确保您的Wi-Fi网络信号良好</span>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <span className={`${styles['text_5']}`}>连接设备（123456789012）</span>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_5']} flex-row justify-between`}>
              <span className={`${styles['text_6']}`}>验证设备</span>
              <img
                className={`${styles['thumbnail_4']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_6']} flex-row justify-between`}>
              <span className={`${styles['text_7']}`}>发送Wi-Fi信息</span>
              <img
                className={`${styles['thumbnail_5']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_7']} flex-row justify-between`}>
              <span className={`${styles['text_8']}`}>设备开始连接路由器</span>
              <img
                className={`${styles['thumbnail_6']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_8']} flex-row justify-between`}>
              <span className={`${styles['text_9']}`}>设备开始激活</span>
              <img
                className={`${styles['thumbnail_7']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_9']} flex-row justify-between`}>
              <span className={`${styles['text_10']}`}>设备开始绑定</span>
              <img
                className={`${styles['thumbnail_8']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_10']} flex-row justify-between`}>
              <span className={`${styles['text_11']}`}>设备开始下载证书</span>
              <img
                className={`${styles['thumbnail_9']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_11']} flex-row justify-between`}>
              <span className={`${styles['text_12']}`}>设备开始连接服务器</span>
              <img
                className={`${styles['thumbnail_10']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_12']} flex-row justify-between`}>
              <span className={`${styles['text_13']}`}>连接设备（123456789012）</span>
              <img
                className={`${styles['thumbnail_11']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_13']} flex-row justify-between`}>
              <span className={`${styles['text_14']}`}>验证设备</span>
              <img
                className={`${styles['thumbnail_12']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_14']} flex-row justify-between`}>
              <span className={`${styles['text_15']}`}>发送Wi-Fi信息</span>
              <img
                className={`${styles['thumbnail_13']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_15']} flex-row justify-between`}>
              <span className={`${styles['text_16']}`}>设备开始连接路由器</span>
              <img
                className={`${styles['thumbnail_14']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_16']} flex-row justify-between`}>
              <span className={`${styles['text_17']}`}>设备开始激活</span>
              <img
                className={`${styles['thumbnail_15']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_17']} flex-row justify-between`}>
              <span className={`${styles['text_18']}`}>设备开始绑定</span>
              <img
                className={`${styles['thumbnail_16']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_18']} flex-row justify-between`}>
              <span className={`${styles['text_19']}`}>设备开始下载证书</span>
              <img
                className={`${styles['thumbnail_17']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_19']} flex-row justify-between`}>
              <span className={`${styles['text_20']}`}>设备开始连接路由器</span>
              <img
                className={`${styles['thumbnail_18']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_20']} flex-row justify-between`}>
              <span className={`${styles['text_21']}`}>设备开始激活</span>
              <img
                className={`${styles['thumbnail_19']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_21']} flex-row justify-between`}>
              <span className={`${styles['text_22']}`}>设备开始绑定</span>
              <img
                className={`${styles['thumbnail_20']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_22']} flex-row justify-between`}>
              <span className={`${styles['text_23']}`}>设备开始下载证书</span>
              <img
                className={`${styles['thumbnail_21']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
          </div>
          <img
            className={`${styles['image_2']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
