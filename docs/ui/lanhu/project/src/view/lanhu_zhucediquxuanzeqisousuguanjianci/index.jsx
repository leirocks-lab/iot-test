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
        <div className={`${styles['group_1']} flex-col`}>
          <div className={`${styles['section_1']} flex-col`}>
            <div className={`${styles['group_2']} flex-row`}>
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
            <div className={`${styles['group_3']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/d154ae5eb73440589c7f2fcaafac0289_mergeImage.png')
                }
              />
              <span className={`${styles['text_2']}`}>国家或地区</span>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <div className={`${styles['group_5']} flex-row`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng7e410347bcb265a484e609cc73069b53e2341354352893f0b969815e5827f773.png')
                  }
                />
                <span className={`${styles['text_3']}`}>中</span>
                <img
                  className={`${styles['label_3']}`}
                  src={
                    require('./assets/img/SketchPng601b99a94a6a3f97d2600129e50995c4df9c55239fc64e8d5cb682e29c423761.png')
                  }
                />
              </div>
              <span className={`${styles['text_4']}`}>取消</span>
            </div>
          </div>
          <div className={`${styles['text-wrapper_1']} flex-col`}>
            <span className={`${styles['text_5']}`}>中国大陆</span>
            <span className={`${styles['text_6']}`}>中国台北</span>
            <span className={`${styles['text_7']}`}>中国香港</span>
            <span className={`${styles['text_8']}`}>中国澳门</span>
            <span className={`${styles['text_9']}`}>中非共和国</span>
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
