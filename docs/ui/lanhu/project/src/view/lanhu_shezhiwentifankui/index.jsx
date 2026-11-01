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
          <img
            className={`${styles['image_5']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
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
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['image-text_3']} flex-row justify-between`}>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/a9c0955c729649e1bfdb39f6d9eef297_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_3']} flex-row`}>
                <span className={`${styles['text_9']}`}>示例</span>
                <span className={`${styles['text_10']}`}>问题反馈</span>
              </div>
            </div>
            <div className={`${styles['list_2']} flex-col`}>
              <div className={`${styles['list-items_1-0']} flex-row`}>
                <div className={`${styles['image-text_4-0']} flex-row justify-between`}>
                  <div className={`${styles['box_2-0']} flex-col`}>
                    <div className={`${styles['box_3-0']} flex-col`} />
                    <img
                      className={`${styles['image_4-0']}`}
                      src={
                        require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_4-0']} flex-col`}>
                    <span className={`${styles['text_4-0']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_5-0']}`}>RW-400PRO</span>
                    <span className={`${styles['text_6-0']}`}>其他问题</span>
                  </div>
                </div>
                <span className={`${styles['text_7-0']}`}>已提交</span>
                <div className={`${styles['box_5-0']} flex-col`} />
              </div>
              <div className={`${styles['list-items_1-1']} flex-row`}>
                <div className={`${styles['image-text_4-1']} flex-row justify-between`}>
                  <div className={`${styles['box_2-1']} flex-col`}>
                    <img
                      className={`${styles['image_3-1']}`}
                      src={
                        require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                      }
                    />
                    <div className={`${styles['box_3-1']} flex-col`} />
                  </div>
                  <div className={`${styles['text-group_4-1']} flex-col`}>
                    <span className={`${styles['text_4-1']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_5-1']}`}>RW-400PRO</span>
                    <span className={`${styles['text_6-1']}`}>APP问题</span>
                  </div>
                </div>
                <span className={`${styles['text_7-1']}`}>已答复</span>
              </div>
              <div className={`${styles['list-items_1-2']} flex-row`}>
                <div className={`${styles['image-text_4-2']} flex-row justify-between`}>
                  <div className={`${styles['box_2-2']} flex-col`}>
                    <div className={`${styles['box_3-2']} flex-col`} />
                    <img
                      className={`${styles['image_4-2']}`}
                      src={
                        require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_4-2']} flex-col`}>
                    <span className={`${styles['text_4-2']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_5-2']}`}>RW-400PRO</span>
                    <span className={`${styles['text_6-2']}`}>设备问题</span>
                  </div>
                </div>
                <span className={`${styles['text_7-2']}`}>已答复</span>
              </div>
              <div className={`${styles['list-items_1-3']} flex-row`}>
                <div className={`${styles['image-text_4-3']} flex-row justify-between`}>
                  <div className={`${styles['box_2-3']} flex-col`}>
                    <div className={`${styles['box_3-3']} flex-col`} />
                    <img
                      className={`${styles['image_4-3']}`}
                      src={
                        require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_4-3']} flex-col`}>
                    <span className={`${styles['text_4-3']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_5-3']}`}>RW-400PRO</span>
                    <span className={`${styles['text_6-3']}`}>服务问题</span>
                  </div>
                </div>
                <span className={`${styles['text_7-3']}`}>已答复</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_11']}`}>我要反馈</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
