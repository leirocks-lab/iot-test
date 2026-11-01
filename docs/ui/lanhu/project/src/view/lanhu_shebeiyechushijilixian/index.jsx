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
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
              }
            />
          </div>
          <div className={`${styles['box_3']} flex-row justify-between`}>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/8c0e3d3e1e31480c95519ef4c2dbdd71_mergeImage.png')
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
          <div className={`${styles['box_4']} flex-row`}>
            <div className={`${styles['image-text_2']} flex-row justify-between`}>
              <div className={`${styles['group_1']} flex-col`} />
              <span className={`${styles['text-group_2']}`}>Offline</span>
            </div>
          </div>
          <div className={`${styles['box_5']} flex-row`}>
            <span className={`${styles['text_2']}`}>--</span>
            <span className={`${styles['text_3']}`}>%</span>
            <div className={`${styles['image-text_3']} flex-col`}>
              <img
                className={`${styles['image_3']}`}
                src={
                  require('./assets/img/SketchPng5854733b2a46f09c2c979d71bafd4d790e374e26b37ce725200a6a3430497308.png')
                }
              />
              <div className={`${styles['text-group_3']} flex-row justify-between`}>
                <span className={`${styles['text_4']}`}>--</span>
                <span className={`${styles['text_5']}`}>%</span>
              </div>
            </div>
            <span className={`${styles['text_6']}`}>--</span>
            <span className={`${styles['text_7']}`}>%</span>
          </div>
          <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
            <span className={`${styles['text_8']}`}>目标湿度</span>
            <span className={`${styles['text_9']}`}>当前湿度</span>
            <span className={`${styles['text_10']}`}>室外湿度</span>
          </div>
          <div className={`${styles['box_6']} flex-col`}>
            <span className={`${styles['text_11']}`}>湿度</span>
            <div className={`${styles['box_7']} flex-col`} />
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_12']}`}>40%</span>
              <span className={`${styles['text_13']}`}>45%</span>
              <span className={`${styles['text_14']}`}>50%</span>
              <span className={`${styles['text_15']}`}>55%</span>
              <span className={`${styles['text_16']}`}>60%</span>
              <span className={`${styles['text_17']}`}>F%</span>
            </div>
            <div className={`${styles['box_8']} flex-col`} />
          </div>
          <div className={`${styles['list_1']} flex-row`}>
            <div className={`${styles['image-text_4-0']} flex-col`}>
              <img
                className={`${styles['label_3-0']}`}
                src={
                  require('./assets/img/SketchPng7cc09db6aece6769574e34a66ca76ffdf6325139b8e5abdb07a767247a797b05.png')
                }
              />
              <span className={`${styles['text-group_4-0']}`}>童锁</span>
            </div>
            <div className={`${styles['image-text_4-1']} flex-col`}>
              <img
                className={`${styles['label_3-1']}`}
                src={
                  require('./assets/img/SketchPngc8f86f936e2aba9077eca1eb2e8c6c77556b9c6fe36c89b51e1e2fd630693464.png')
                }
              />
              <span className={`${styles['text-group_4-1']}`}>熄灯</span>
            </div>
            <div className={`${styles['image-text_4-2']} flex-col`}>
              <img
                className={`${styles['label_3-2']}`}
                src={
                  require('./assets/img/SketchPngd562ea1b02c5ab26108859712c95953f9864308d235af2b6f882944d735a6e0c.png')
                }
              />
              <span className={`${styles['text-group_4-2']}`}>静音</span>
            </div>
          </div>
          <div className={`${styles['box_9']} flex-row justify-between`}>
            <div className={`${styles['image-text_5']} flex-row justify-between`}>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/f476ad389ee14bf5885fa26fd2bc2fd0_mergeImage.png')
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
          <div className={`${styles['box_10']} flex-col`}>
            <div className={`${styles['list_2']} flex-row`}>
              <div className={`${styles['image-text_6-0']} flex-col`}>
                <img
                  className={`${styles['label_5-0']}`}
                  src={
                    require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                  }
                />
                <span className={`${styles['text-group_6-0']}`}>开关</span>
              </div>
              <div className={`${styles['image-text_6-1']} flex-col`}>
                <img
                  className={`${styles['label_5-1']}`}
                  src={
                    require('./assets/img/SketchPng474c977c7b75f463007a7a6059c83344579d74e16f38c3f99f29f83daf7718d2.png')
                  }
                />
                <span className={`${styles['text-group_6-1']}`}>定时｜开</span>
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
