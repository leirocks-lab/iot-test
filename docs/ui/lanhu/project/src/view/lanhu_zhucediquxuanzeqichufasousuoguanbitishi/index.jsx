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
          <div className={`${styles['group_2']} flex-row justify-between`}>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/5bf4edaf66e44ce8b17192cca984743d_mergeImage.png')
              }
            />
            <span className={`${styles['text_2']}`}>国家或地区</span>
          </div>
          <div className={`${styles['group_3']} flex-row justify-between`}>
            <div className={`${styles['box_2']} flex-row justify-between`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng7e410347bcb265a484e609cc73069b53e2341354352893f0b969815e5827f773.png')
                  }
                />
                <span className={`${styles['text-group_1']}`}>请输入国家或地区名称</span>
              </div>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/SketchPng601b99a94a6a3f97d2600129e50995c4df9c55239fc64e8d5cb682e29c423761.png')
                }
              />
            </div>
            <span className={`${styles['text_3']}`}>取消</span>
          </div>
          <div className={`${styles['group_4']} flex-row justify-between`}>
            <div className={`${styles['box_3']} flex-col`}>
              <span className={`${styles['text_4']}`}>A</span>
              <div className={`${styles['text-wrapper_1']} flex-col`}>
                <span className={`${styles['text_5']}`}>美国</span>
              </div>
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_6']}`}>美国</span>
              </div>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_7']}`}>美国</span>
              </div>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_8']}`}>美国</span>
              </div>
              <span className={`${styles['text_9']}`}>B</span>
              <div className={`${styles['text-wrapper_5']} flex-col`}>
                <span className={`${styles['text_10']}`}>巴哈马</span>
              </div>
              <div className={`${styles['text-wrapper_6']} flex-col`}>
                <span className={`${styles['text_11']}`}>巴林</span>
              </div>
              <span className={`${styles['text_12']}`}>C</span>
            </div>
            <span className={`${styles['paragraph_1']}`}>
              A<br />B<br />C<br />D<br />E<br />F<br />G<br />H<br />I<br />J<br />K<br />L<br />M<br />N<br />O<br />P
              <br />Q<br />R<br />S<br />T<br />U<br />V<br />W<br />X<br />Y<br />Z
            </span>
          </div>
          <div className={`${styles['text-wrapper_7']} flex-col`}>
            <span className={`${styles['text_13']}`}>库克群岛</span>
          </div>
          <div className={`${styles['text-wrapper_8']} flex-col`}>
            <span className={`${styles['text_14']}`}>库拉索</span>
          </div>
          <span className={`${styles['text_15']}`}>D</span>
          <div className={`${styles['text-wrapper_9']} flex-col`}>
            <span className={`${styles['text_16']}`}>多米尼克</span>
          </div>
          <div className={`${styles['text-wrapper_10']} flex-col`}>
            <span className={`${styles['text_17']}`}>多多多多</span>
          </div>
          <span className={`${styles['text_18']}`}>E</span>
          <div className={`${styles['text-wrapper_11']} flex-col`}>
            <span className={`${styles['text_19']}`}>巴哈马</span>
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
