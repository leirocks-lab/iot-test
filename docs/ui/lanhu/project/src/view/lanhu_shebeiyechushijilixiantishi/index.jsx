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
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
              }
            />
          </div>
          <div className={`${styles['block_2']} flex-row justify-between`}>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/7b5e841c17624b4282ea89cf7df23b61_mergeImage.png')
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
          <div className={`${styles['block_3']} flex-row`}>
            <div className={`${styles['image-text_2']} flex-row justify-between`}>
              <div className={`${styles['group_1']} flex-col`} />
              <span className={`${styles['text-group_2']}`}>Offline</span>
            </div>
          </div>
          <div className={`${styles['block_4']} flex-row`}>
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
          <div className={`${styles['block_5']} flex-col`}>
            <span className={`${styles['text_11']}`}>湿度</span>
            <div className={`${styles['section_1']} flex-col`} />
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_12']}`}>40%</span>
              <span className={`${styles['text_13']}`}>45%</span>
              <span className={`${styles['text_14']}`}>50%</span>
              <span className={`${styles['text_15']}`}>55%</span>
              <span className={`${styles['text_16']}`}>60%</span>
              <span className={`${styles['text_17']}`}>F%</span>
            </div>
            <div className={`${styles['section_2']} flex-col`} />
          </div>
          <div className={`${styles['block_6']} flex-row`}>
            <div className={`${styles['block_7']} flex-row`}>
              <div className={`${styles['image-text_4']} flex-col`}>
                <img
                  className={`${styles['label_3']}`}
                  src={
                    require('./assets/img/SketchPng7cc09db6aece6769574e34a66ca76ffdf6325139b8e5abdb07a767247a797b05.png')
                  }
                />
                <span className={`${styles['text-group_4']}`}>童锁</span>
              </div>
            </div>
            <div className={`${styles['block_8']} flex-row`}>
              <div className={`${styles['image-text_5']} flex-col`}>
                <img
                  className={`${styles['label_4']}`}
                  src={
                    require('./assets/img/SketchPngc8f86f936e2aba9077eca1eb2e8c6c77556b9c6fe36c89b51e1e2fd630693464.png')
                  }
                />
                <span className={`${styles['text-group_5']}`}>熄灯</span>
              </div>
            </div>
            <div className={`${styles['block_9']} flex-row`}>
              <div className={`${styles['image-text_6']} flex-col`}>
                <img
                  className={`${styles['label_5']}`}
                  src={
                    require('./assets/img/SketchPngd562ea1b02c5ab26108859712c95953f9864308d235af2b6f882944d735a6e0c.png')
                  }
                />
                <span className={`${styles['text-group_6']}`}>静音</span>
              </div>
            </div>
          </div>
          <div className={`${styles['block_10']} flex-row justify-between`}>
            <div className={`${styles['image-text_7']} flex-row justify-between`}>
              <img
                className={`${styles['label_6']}`}
                src={
                  require('./assets/img/355012b722624f9e89014a42bc06480a_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_7']}`}>睡眠模式</span>
            </div>
            <img
              className={`${styles['thumbnail_3']}`}
              src={
                require('./assets/img/SketchPngecba5a57d8b40655d88d77a028bcf16d4fd1ebc42fe99b8ff0606436b39aea59.png')
              }
            />
          </div>
          <div className={`${styles['block_11']} flex-col`}>
            <div className={`${styles['section_3']} flex-row justify-between`}>
              <div className={`${styles['image-text_8']} flex-col`}>
                <img
                  className={`${styles['label_7']}`}
                  src={
                    require('./assets/img/SketchPngd8c3eed19b605b444c21bf6ad76075fa3c39857b9501dfb7909ea0bacc48806c.png')
                  }
                />
                <span className={`${styles['text-group_8']}`}>开关</span>
              </div>
              <div className={`${styles['image-text_9']} flex-col`}>
                <img
                  className={`${styles['label_8']}`}
                  src={
                    require('./assets/img/SketchPng474c977c7b75f463007a7a6059c83344579d74e16f38c3f99f29f83daf7718d2.png')
                  }
                />
                <span className={`${styles['text-group_9']}`}>定时｜开</span>
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
        <div className={`${styles['box_2']} flex-col`}>
          <div className={`${styles['box_3']} flex-row`}>
            <div className={`${styles['text-group_10']} flex-col`}>
              <span className={`${styles['text_18']}`}>设备离线了</span>
              <span className={`${styles['text_19']}`}>请确认设备已接通电源</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_20']}`}>我知道了</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
