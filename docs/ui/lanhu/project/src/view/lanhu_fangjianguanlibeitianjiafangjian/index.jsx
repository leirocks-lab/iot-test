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
          <div className={`${styles['block_1']} flex-col`}>
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
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['group_2']} flex-row justify-between`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/b02bbea840494735b58f14675cea8594_mergeImage.png')
                  }
                />
                <div className={`${styles['text-group_1']} flex-row`}>
                  <span className={`${styles['text_2']}`}>示例</span>
                  <span className={`${styles['text_3']}`}>添加房间&nbsp;2个</span>
                </div>
              </div>
              <span className={`${styles['text_4']}`}>确认</span>
            </div>
            <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
              <span className={`${styles['text_5']}`}>房间名称</span>
              <span className={`${styles['text_6']}`}>0/20</span>
            </div>
            <div className={`${styles['group_3']} flex-row justify-between`}>
              <span className={`${styles['text_7']}`}>请输入房间名称</span>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPnge855ecdbfb9bd04ea2e2380a45cf820af89120c54376d94607205dd80e3e4453.png')
                }
              />
            </div>
            <span className={`${styles['text_8']}`}>推荐名称</span>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_9']}`}>书房</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_10']}`}>儿童房</span>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <span className={`${styles['text_11']}`}>餐厅</span>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/SketchPng5a38973c946cb5c49fabe1d1e9286a0043c9f8c4a19f20d1c90e6a066f2c51ea.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_4']} flex-col`}>
              <span className={`${styles['text_12']}`}>阳台</span>
            </div>
            <div className={`${styles['text-wrapper_5']} flex-col`}>
              <span className={`${styles['text_13']}`}>浴室</span>
            </div>
            <div className={`${styles['text-wrapper_6']} flex-col`}>
              <span className={`${styles['text_14']}`}>地下室</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
