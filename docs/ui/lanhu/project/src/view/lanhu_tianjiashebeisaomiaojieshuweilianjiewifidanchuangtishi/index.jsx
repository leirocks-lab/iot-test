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
          <div className={`${styles['group_1']} flex-col`}>
            <div className={`${styles['box_1']} flex-row`}>
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
                  require('./assets/img/57ea38d7b2f74556a2cee3ba9bef51ba_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_1']}`}>添加设备</span>
            </div>
            <div className={`${styles['image-text_2']} flex-col`}>
              <img
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPnga7f6342d3c3d8916a963c8892349cf504baf655cf0d4ce96f2f6134c7b30d3ec.png')
                }
              />
              <div className={`${styles['text-group_2']} flex-col`}>
                <span className={`${styles['text_2']}`}>连接Wi-Fi网络</span>
                <span className={`${styles['paragraph_1']}`}>
                  *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                  <br />
                  请勿开启5GH频段。
                </span>
              </div>
            </div>
            <div className={`${styles['box_2']} flex-row`}>
              <div className={`${styles['image-text_3']} flex-row justify-between`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng3cb78ec79977f575892b90a02399ce06b46bd11c62b0f5428b437068638f7292.png')
                  }
                />
                <span className={`${styles['text-group_3']}`}>请选择您的家庭Wi-Fi</span>
              </div>
            </div>
            <span className={`${styles['text_3']}`}>没有连接到家庭Wi-Fi</span>
            <div className={`${styles['box_3']} flex-row justify-between`}>
              <div className={`${styles['image-text_4']} flex-row justify-between`}>
                <img
                  className={`${styles['label_3']}`}
                  src={
                    require('./assets/img/SketchPng4d13fd308481531fc141fb4256149d3acfc774600734363b59db40979e36151f.png')
                  }
                />
                <span className={`${styles['text-group_4']}`}>请输入Wi-Fi密码</span>
              </div>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/SketchPngf531504a9f136c786f36b27b0ea498de42fb34a910bd9248eca59ff1116319b3.png')
                }
              />
            </div>
            <span className={`${styles['text_4']}`}>FAQ</span>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_5']}`}>下一步</span>
            </div>
          </div>
          <img
            className={`${styles['image_3']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
        </div>
        <div className={`${styles['section_2']} flex-col`}>
          <div className={`${styles['group_2']} flex-col`}>
            <div className={`${styles['text-group_5']} flex-col`}>
              <span className={`${styles['text_6']}`}>未连接Wi-Fi</span>
              <span className={`${styles['text_7']}`}>手机连接家庭Wi-Fi后才能添加设备</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_8']}`}>取消</span>
              <span className={`${styles['text_9']}`}>去连接</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
