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
        <img
          className={`${styles['image_1']}`}
          src={
            require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
          }
        />
        <div className={`${styles['group_1']} flex-col`}>
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
          <div className={`${styles['group_3']} flex-row justify-between`}>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/01aeb23ffe2248eca8f46c3c2721deae_mergeImage.png')
              }
            />
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <span className={`${styles['text-group_1']}`}>Dehumidifier</span>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPngc223818979f6181347b55858a29b68365d47ebababd8d834021fd26776b8ba64.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['group_4']} flex-row`}>
            <div className={`${styles['image-text_2']} flex-row justify-between`}>
              <div className={`${styles['box_1']} flex-col`} />
              <span className={`${styles['text-group_2']}`}>Dehumidifying</span>
            </div>
          </div>
          <div className={`${styles['group_5']} flex-row`}>
            <span className={`${styles['text_2']}`}>40</span>
            <span className={`${styles['text_3']}`}>%</span>
            <div className={`${styles['image-text_3']} flex-col`}>
              <img
                className={`${styles['image_3']}`}
                src={
                  require('./assets/img/SketchPng5854733b2a46f09c2c979d71bafd4d790e374e26b37ce725200a6a3430497308.png')
                }
              />
              <div className={`${styles['text-group_3']} flex-row justify-between`}>
                <span className={`${styles['text_4']}`}>32</span>
                <span className={`${styles['text_5']}`}>%</span>
              </div>
            </div>
            <span className={`${styles['text_6']}`}>30</span>
            <span className={`${styles['text_7']}`}>%</span>
          </div>
          <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
            <span className={`${styles['text_8']}`}>目标湿度</span>
            <span className={`${styles['text_9']}`}>当前湿度</span>
            <span className={`${styles['text_10']}`}>室外湿度</span>
          </div>
          <div className={`${styles['group_6']} flex-col`}>
            <span className={`${styles['text_11']}`}>湿度</span>
            <div className={`${styles['block_1']} flex-col`}>
              <div className={`${styles['group_7']} flex-col`}>
                <div className={`${styles['box_2']} flex-col`} />
              </div>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_12']}`}>40%</span>
              <span className={`${styles['text_13']}`}>45%</span>
              <span className={`${styles['text_14']}`}>50%</span>
              <span className={`${styles['text_15']}`}>55%</span>
              <span className={`${styles['text_16']}`}>60%</span>
              <span className={`${styles['text_17']}`}>F%</span>
            </div>
          </div>
          <div className={`${styles['list_1']} flex-row`}>
            <div className={`${styles['image-text_4-0']} flex-col`}>
              <img
                className={`${styles['label_3-0']}`}
                src={
                  require('./assets/img/SketchPng0b0b11675fbf1b9c65940392756ebcb50631d9cb384cab3a4eb561439e7341e8.png')
                }
              />
              <span className={`${styles['text-group_4-0']}`}>童锁</span>
            </div>
            <div className={`${styles['image-text_4-1']} flex-col`}>
              <img
                className={`${styles['label_3-1']}`}
                src={
                  require('./assets/img/SketchPnga4c263596b1dff65d4a121ebd97fdbf965d5e4acf5b20a9d925750ad5d2c33df.png')
                }
              />
              <span className={`${styles['text-group_4-1']}`}>熄灯</span>
            </div>
            <div className={`${styles['image-text_4-2']} flex-col`}>
              <img
                className={`${styles['label_3-2']}`}
                src={
                  require('./assets/img/SketchPng57d91f583d54ccb27f75fa5ee81c139c4eae52403f5ba33e2423a7d66463d7ff.png')
                }
              />
              <span className={`${styles['text-group_4-2']}`}>静音</span>
            </div>
          </div>
          <div className={`${styles['group_8']} flex-row justify-between`}>
            <div className={`${styles['image-text_5']} flex-row justify-between`}>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/7eb8b76489c7413aa1b9b3365c2ddd49_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_5']}`}>睡眠模式</span>
            </div>
            <img
              className={`${styles['thumbnail_3']}`}
              src={
                require('./assets/img/SketchPngecba5a57d8b40655d88d77a028bcf16d4fd1ebc42fe99b8ff0606436b39aea59.png')
              }
            />
          </div>
          <div className={`${styles['group_9']} flex-col`}>
            <div className={`${styles['list_2']} flex-row`}>
              <div className={`${styles['image-text_6-0']} flex-col`}>
                <img
                  className={`${styles['label_5-0']}`}
                  src={
                    require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                  }
                />
                <span className={`${styles['text-group_6-0']}`}>开关</span>
              </div>
              <div className={`${styles['image-text_6-1']} flex-col`}>
                <img
                  className={`${styles['label_5-1']}`}
                  src={
                    require('./assets/img/SketchPng1a9ce8d0f73e00890a08f6266bda5ca83249b65335fce3822d855af1acc7c7c7.png')
                  }
                />
                <span className={`${styles['text-group_6-1']}`}>定时</span>
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
      </div>
    );
  }
}
export default DDS_lanhupage_0;
