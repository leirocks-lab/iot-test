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
        <div className={`${styles['block_2']} flex-row justify-between`}>
          <img
            className={`${styles['label_1']}`}
            src={
              require('./assets/img/4567286f2ff04b9980ca9df90bd9462e_mergeImage.png')
            }
          />
          <div className={`${styles['image-text_1']} flex-row justify-between`}>
            <span className={`${styles['text-group_1']}`}>Humidifier</span>
            <img
              className={`${styles['label_2']}`}
              src={
                require('./assets/img/SketchPngc223818979f6181347b55858a29b68365d47ebababd8d834021fd26776b8ba64.png')
              }
            />
          </div>
        </div>
        <div className={`${styles['block_3']} flex-row`}>
          <div className={`${styles['image-text_2']} flex-row justify-between`}>
            <div className={`${styles['box_1']} flex-col`} />
            <span className={`${styles['text-group_2']}`}>Humidifying</span>
          </div>
        </div>
        <img
          className={`${styles['image_2']}`}
          src={
            require('./assets/img/SketchPng24124d0161e2dab6084418225ce1d6b75059e631b923719bdec6b3426e7c8922.png')
          }
        />
        <div className={`${styles['text-wrapper_1']} flex-row`}>
          <span className={`${styles['text_2']}`}>40</span>
          <span className={`${styles['text_3']}`}>%</span>
          <span className={`${styles['text_4']}`}>32</span>
          <span className={`${styles['text_5']}`}>%</span>
          <span className={`${styles['text_6']}`}>30</span>
          <span className={`${styles['text_7']}`}>%</span>
        </div>
        <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
          <span className={`${styles['text_8']}`}>目标湿度</span>
          <span className={`${styles['text_9']}`}>当前湿度</span>
          <span className={`${styles['text_10']}`}>室外湿度</span>
        </div>
        <div className={`${styles['block_4']} flex-col`}>
          <span className={`${styles['text_11']}`}>湿度</span>
          <div className={`${styles['block_5']} flex-col`}>
            <div className={`${styles['group_1']} flex-col`}>
              <div className={`${styles['section_1']} flex-col`} />
            </div>
          </div>
          <div className={`${styles['text-wrapper_3']} flex-row justify-between`}>
            <span className={`${styles['text_12']}`}>40%</span>
            <span className={`${styles['text_13']}`}>45%</span>
            <span className={`${styles['text_14']}`}>50%</span>
            <span className={`${styles['text_15']}`}>55%</span>
            <span className={`${styles['text_16']}`}>60%</span>
            <span className={`${styles['text_17']}`}>F%</span>
          </div>
        </div>
        <div className={`${styles['block_6']} flex-col`}>
          <span className={`${styles['text_18']}`}>雾量</span>
          <div className={`${styles['list_1']} flex-row`}>
            <div className={`${styles['text-wrapper_4-0']} flex-col`}>
              <span className={`${styles['text_19-0']}`}>恒湿</span>
            </div>
            <div className={`${styles['text-wrapper_4-1']} flex-col`}>
              <span className={`${styles['text_19-1']}`}>1档</span>
            </div>
            <div className={`${styles['text-wrapper_4-2']} flex-col`}>
              <span className={`${styles['text_19-2']}`}>2档</span>
            </div>
            <div className={`${styles['text-wrapper_4-3']} flex-col`}>
              <span className={`${styles['text_19-3']}`}>3档</span>
            </div>
          </div>
        </div>
        <div className={`${styles['block_7']} flex-col`}>
          <div className={`${styles['text-wrapper_5']} flex-row`}>
            <span className={`${styles['text_20']}`}>风速</span>
          </div>
          <div className={`${styles['block_8']} flex-row justify-between`}>
            <div className={`${styles['text-wrapper_6']} flex-col`}>
              <span className={`${styles['text_21']}`}>静音</span>
            </div>
            <div className={`${styles['text-wrapper_7']} flex-col`}>
              <span className={`${styles['text_22']}`}>低档</span>
            </div>
            <div className={`${styles['text-wrapper_8']} flex-col`}>
              <span className={`${styles['text_23']}`}>中档</span>
            </div>
            <div className={`${styles['text-wrapper_9']} flex-col`}>
              <span className={`${styles['text_24']}`}>高档</span>
            </div>
          </div>
        </div>
        <div className={`${styles['image-wrapper_1']} flex-col`}>
          <img
            className={`${styles['image_3']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
        </div>
        <div className={`${styles['block_9']} flex-col`}>
          <div className={`${styles['list_2']} flex-row`}>
            <div className={`${styles['image-text_3-0']} flex-col`}>
              <img
                className={`${styles['label_3-0']}`}
                src={
                  require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                }
              />
              <span className={`${styles['text-group_3-0']}`}>开关</span>
            </div>
            <div className={`${styles['image-text_3-1']} flex-col`}>
              <img
                className={`${styles['label_3-1']}`}
                src={
                  require('./assets/img/SketchPng1a9ce8d0f73e00890a08f6266bda5ca83249b65335fce3822d855af1acc7c7c7.png')
                }
              />
              <span className={`${styles['text-group_3-1']}`}>定时</span>
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
