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
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/2e7054228d4a42c683916c607261b7ec_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_1']}`}>添加设备</span>
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng0d74747ff335880506c7ab72e21c47de6b8632682584e4a5abd255ef1b1d44b8.png')
              }
            />
            <span className={`${styles['text_2']}`}>添加失败</span>
            <span className={`${styles['text_3']}`}>*请确保您的Wi-Fi网络信号良好：</span>
            <div className={`${styles['group_2']} flex-row justify-between`}>
              <span className={`${styles['text_4']}`}>连接至设备热点</span>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_3']} flex-row justify-between`}>
              <span className={`${styles['text_5']}`}>发送Wi-Fi认证至设备</span>
              <img
                className={`${styles['thumbnail_4']}`}
                src={
                  require('./assets/img/SketchPng1637172f5512a46cd258e24ea60582f4c868a50e55fb13150ca0f9ae380c6988.png')
                }
              />
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <span className={`${styles['text_6']}`}>连接至家庭Wi-Fi</span>
              <img
                className={`${styles['thumbnail_5']}`}
                src={
                  require('./assets/img/SketchPngb7096fecf084f78c9cc457b617c57ec2bc200240a9ba55535ec920bf3480f8f0.png')
                }
              />
            </div>
            <div className={`${styles['group_5']} flex-row justify-between`}>
              <span className={`${styles['text_7']}`}>绑定设备</span>
              <div className={`${styles['block_1']} flex-col`} />
            </div>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_8']}`}>再次配网</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_9']}`}>0</span>
              <span className={`${styles['text_10']}`}>%</span>
            </div>
          </div>
          <img
            className={`${styles['image_3']}`}
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
