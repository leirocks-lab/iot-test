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
        <div className={`${styles['group_4']} flex-col`}>
          <div className={`${styles['section_7']} flex-row`}>
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
          <div className={`${styles['image-text_5']} flex-row justify-between`}>
            <img
              className={`${styles['label_10']}`}
              src={
                require('./assets/img/e09e1e1dcdd1465d829ec3bf693c7e69_mergeImage.png')
              }
            />
            <div className={`${styles['text-group_4']} flex-row`}>
              <span className={`${styles['text_12']}`}>示例</span>
              <span className={`${styles['text_13']}`}>我要反馈</span>
            </div>
          </div>
          <div className={`${styles['group_2']} flex-row justify-between`}>
            <div className={`${styles['image-text_6']} flex-row justify-between`}>
              <div className={`${styles['image-wrapper_1']} flex-col`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                  }
                />
              </div>
              <span className={`${styles['text-group_2']}`}>Air&nbsp;Conditioner</span>
            </div>
            <img
              className={`${styles['thumbnail_3']}`}
              src={
                require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
              }
            />
          </div>
        </div>
        <div className={`${styles['section_2']} flex-col`}>
          <div className={`${styles['section_3']} flex-row justify-between`}>
            <span className={`${styles['text_4']}`}>设备问题</span>
            <img
              className={`${styles['thumbnail_4']}`}
              src={
                require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
              }
            />
          </div>
          <span className={`${styles['text_5']}`}>
            柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后，屏幕仍持续显示满冰提醒。缺水提示持续闪烁，设备无漏水情况。柜内温度无法稳定，屏幕温度数值无故持续升高。实际温度与触控屏显示温差极大，相差约&nbsp;5&nbsp;摄氏度。水箱水量充足，但制冰机自动停止制冰。冰块快速融化并在储冰仓底部结块粘连。取完所有冰块后
          </span>
          <div className={`${styles['block_3']} flex-row justify-between`}>
            <div className={`${styles['image-wrapper_2']} flex-col`}>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/SketchPng1da187d2d51f2b0f4f50a8ca82fe23c33effa9a49d241d7c1018a2ed713a57af.png')
                }
              />
            </div>
            <div className={`${styles['image-wrapper_3']} flex-col`}>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/SketchPng1da187d2d51f2b0f4f50a8ca82fe23c33effa9a49d241d7c1018a2ed713a57af.png')
                }
              />
            </div>
            <div className={`${styles['image-wrapper_4']} flex-col`}>
              <img
                className={`${styles['label_5']}`}
                src={
                  require('./assets/img/SketchPng1da187d2d51f2b0f4f50a8ca82fe23c33effa9a49d241d7c1018a2ed713a57af.png')
                }
              />
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng58749ed2344c78102bbe67bf9d03f1a0b3c85598186e7b4eb5132153351fd230.png')
              }
            />
          </div>
          <span className={`${styles['text_6']}`}>最多可上传4个照片</span>
          <div className={`${styles['block_4']} flex-row justify-between`}>
            <div className={`${styles['image-wrapper_5']} flex-col`}>
              <img
                className={`${styles['label_6']}`}
                src={
                  require('./assets/img/SketchPng1da187d2d51f2b0f4f50a8ca82fe23c33effa9a49d241d7c1018a2ed713a57af.png')
                }
              />
            </div>
            <div className={`${styles['image-wrapper_6']} flex-col`}>
              <img
                className={`${styles['label_7']}`}
                src={
                  require('./assets/img/SketchPng1da187d2d51f2b0f4f50a8ca82fe23c33effa9a49d241d7c1018a2ed713a57af.png')
                }
              />
            </div>
          </div>
          <span className={`${styles['text_7']}`}>最多可上传2个视频</span>
        </div>
        <div className={`${styles['text-wrapper_3']} flex-col`}>
          <span className={`${styles['text_14']}`}>提交</span>
        </div>
        <img
          className={`${styles['image_7']}`}
          src={
            require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
          }
        />
        <div className={`${styles['section_6']} flex-row`}>
          <div className={`${styles['box_2']} flex-col`}>
            <div className={`${styles['block_5']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_15']}`}>1/3</span>
              </div>
              <img
                className={`${styles['label_8']}`}
                src={
                  require('./assets/img/SketchPng8a059597859edac2ed62fa98b6529b2bca87c9dc69d36e1aba85812f74545010.png')
                }
              />
            </div>
          </div>
          <img
            className={`${styles['image_4']}`}
            src={
              require('./assets/img/SketchPng1e5b2e938363a37d2bd56e4832b4cb40ab69946e8a5f86b88fcf1a4995e9edf8.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
