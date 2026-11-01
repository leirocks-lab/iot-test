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
            <div className={`${styles['group_3']} flex-row`}>
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
                  require('./assets/img/2b05c538a32e44f69fe2626ebd323558_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>添加设备</span>
                <span className={`${styles['text_3']}`}>添加设备</span>
              </div>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <span className={`${styles['text_4']}`}>设备昵称</span>
              <div className={`${styles['text-wrapper_1']}`}>
                <span className={`${styles['text_5']}`}>4</span>
                <span className={`${styles['text_6']}`}>/20</span>
              </div>
            </div>
            <div className={`${styles['group_5']} flex-row`}>
              <span className={`${styles['text_7']}`}>台面风扇</span>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng8049ffe0dee882b2723f1cc43ff8a34fd21e9b439823e0e47da632da6be74c33.png')
                }
              />
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPng757c641c47da43cad990948c8f352852188f4b43b542cfc5496062fe733483a7.png')
                }
              />
            </div>
            <span className={`${styles['text_8']}`}>默认设备类型，可在此修改并设置设备名称</span>
            <div className={`${styles['group_6']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_9']}`}>不设置，跳过</span>
              </div>
              <div className={`${styles['box_1']} flex-col`} />
              <span className={`${styles['text_10']}`}>下一步</span>
            </div>
            <div className={`${styles['group_7']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_11']}`}>不设置，跳过</span>
              </div>
              <div className={`${styles['box_2']} flex-col`} />
              <span className={`${styles['text_12']}`}>完成</span>
            </div>
          </div>
          <img
            className={`${styles['image_2']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
        </div>
        <img
          className={`${styles['image_3']}`}
          src={
            require('./assets/img/SketchPng05c4dfbacf075afd21fee20215de0447861bf261e14b37837235f1b39364d28b.png')
          }
        />
      </div>
    );
  }
}
export default DDS_lanhupage_0;
