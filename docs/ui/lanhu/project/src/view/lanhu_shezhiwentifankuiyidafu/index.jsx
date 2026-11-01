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
        <div className={`${styles['box_1']} flex-col`}>
          <div className={`${styles['box_2']} flex-row`}>
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
          <div className={`${styles['box_3']} flex-row`}>
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/cd21e698f90e454580593a152d332d0d_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>示例</span>
                <span className={`${styles['text_3']}`}>问题反馈</span>
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles['box_4']} flex-col`}>
          <div className={`${styles['block_1']} flex-row justify-between`}>
            <div className={`${styles['image-text_2']} flex-row justify-between`}>
              <div className={`${styles['box_5']} flex-col`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                  }
                />
                <div className={`${styles['group_1']} flex-col`} />
              </div>
              <div className={`${styles['text-group_2']} flex-col`}>
                <span className={`${styles['text_4']}`}>Air&nbsp;Conditioner</span>
                <span className={`${styles['text_5']}`}>RW-400PRO</span>
                <span className={`${styles['text_6']}`}>APP问题</span>
              </div>
            </div>
            <div className={`${styles['section_1']} flex-col`}>
              <span className={`${styles['text_7']}`}>已答复</span>
              <div className={`${styles['image-text_3']} flex-row justify-between`}>
                <span className={`${styles['text-group_3']}`}>收起</span>
                <img
                  className={`${styles['thumbnail_3']}`}
                  src={
                    require('./assets/img/SketchPng7b04382500b8b38e2090e9406e044867f4f65e641ad8d776f0ea315f0db53805.png')
                  }
                />
              </div>
            </div>
          </div>
          <span className={`${styles['text_8']}`}>问题：</span>
          <span className={`${styles['text_9']}`}>
            柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。
          </span>
          <span className={`${styles['text_10']}`}>答复：</span>
          <span className={`${styles['text_11']}`}>
            请详细说明书您遇到问题的时间、地点和问题情况。请详细说明书您遇到问题的时间、地点和问题情况。
          </span>
        </div>
        <div className={`${styles['text-wrapper_1']} flex-col`}>
          <span className={`${styles['text_12']}`}>再次反馈</span>
        </div>
        <img
          className={`${styles['image_3']}`}
          src={
            require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
          }
        />
      </div>
    );
  }
}
export default DDS_lanhupage_0;
