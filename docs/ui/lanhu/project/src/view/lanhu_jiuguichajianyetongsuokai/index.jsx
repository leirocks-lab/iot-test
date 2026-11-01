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
          <div className={`${styles['group_2']} flex-col`}>
            <div className={`${styles['group_3']} flex-row`}>
              <span className={`${styles['text_1']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_1']}`}
                src={
                  require('./assets/img/SketchPng6a27fa4042863b98a5a7a9bfc7c5865f310b56bfc9ccb2987cc8df89dc037218.png')
                }
              />
              <img
                className={`${styles['thumbnail_2']}`}
                src={
                  require('./assets/img/SketchPngb3f2f90ac369a580e677221ed428c4d27c1acf3525e5b76c694ac5a67c49f56c.png')
                }
              />
              <img
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPnge83bc6f2d9d38a6cfee9f97528a3e46d5006637b6a0dbe55250ad92528499a38.png')
                }
              />
            </div>
            <div className={`${styles['group_4']} flex-row`}>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng6ebc2e7ec02dcb74e970f5807decf7decc612503a36619059b58534d6135213e.png')
                }
              />
              <span className={`${styles['text_2']}`}>酒柜</span>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/SketchPnged609f229d14643fd946a0689a5b3006b7aa0e6d02c8d7eb1b91a5d511e8686e.png')
                }
              />
            </div>
            <div className={`${styles['group_5']} flex-row`}>
              <div className={`${styles['section_1']} flex-row`}>
                <div className={`${styles['image-text_1']} flex-row justify-between`}>
                  <div className={`${styles['block_1']} flex-col`} />
                  <span className={`${styles['text-group_1']}`}>制冷中</span>
                </div>
              </div>
            </div>
            <div className={`${styles['group_6']} flex-row`}>
              <div className={`${styles['box_1']} flex-col`}>
                <div className={`${styles['block_2']} flex-col`} />
                <div className={`${styles['block_3']} flex-col`}>
                  <div className={`${styles['box_2']} flex-row justify-between`}>
                    <div className={`${styles['block_4']} flex-col`}>
                      <div className={`${styles['box_3']} flex-col`} />
                    </div>
                    <div className={`${styles['block_5']} flex-col`}>
                      <div className={`${styles['group_7']} flex-col`} />
                    </div>
                  </div>
                  <div className={`${styles['image-wrapper_1']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_2']}`}
                      src={
                        require('./assets/img/SketchPng459541dfd00d57582df89e5a9479443c03c42e03eaff90f027ddfc3c0be0b9ad.png')
                      }
                    />
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/SketchPng459541dfd00d57582df89e5a9479443c03c42e03eaff90f027ddfc3c0be0b9ad.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['group_8']} flex-col`}>
            <div className={`${styles['block_6']} flex-row`}>
              <div className={`${styles['group_9']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_1']} flex-col`}>
                  <span className={`${styles['text_3']}`}>°C</span>
                </div>
                <span className={`${styles['text_4']}`}>°F</span>
              </div>
            </div>
            <div className={`${styles['block_7']} flex-row justify-between`}>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/SketchPng809a0249394ae129d45944b46c36051af6f47683881b9859a48a944a954cafc2.png')
                }
              />
              <div className={`${styles['box_4']} flex-col`}>
                <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
                  <span className={`${styles['text_5']}`}>35</span>
                  <span className={`${styles['text_6']}`}>°C</span>
                </div>
                <span className={`${styles['text_7']}`}>左温区&nbsp;温度设置</span>
              </div>
              <img
                className={`${styles['label_5']}`}
                src={
                  require('./assets/img/SketchPng820c1c9c44dc49052383183436a74facb2e6d9c39add32629bf1ab41bda25c46.png')
                }
              />
            </div>
            <div className={`${styles['block_8']} flex-row justify-between`}>
              <img
                className={`${styles['label_6']}`}
                src={
                  require('./assets/img/SketchPng809a0249394ae129d45944b46c36051af6f47683881b9859a48a944a954cafc2.png')
                }
              />
              <div className={`${styles['group_10']} flex-col`}>
                <div className={`${styles['text-wrapper_3']} flex-row justify-between`}>
                  <span className={`${styles['text_8']}`}>40</span>
                  <span className={`${styles['text_9']}`}>°C</span>
                </div>
                <span className={`${styles['text_10']}`}>右温区&nbsp;温度设置</span>
              </div>
              <img
                className={`${styles['label_7']}`}
                src={
                  require('./assets/img/SketchPng820c1c9c44dc49052383183436a74facb2e6d9c39add32629bf1ab41bda25c46.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['group_11']} flex-col`}>
            <div className={`${styles['box_5']} flex-row justify-between`}>
              <div className={`${styles['image-text_2']} flex-row justify-between`}>
                <img
                  className={`${styles['label_8']}`}
                  src={
                    require('./assets/img/SketchPngbbab2f275822e2f202615c33ad80b1e73adf77ef2eb5ba5124dee98b37d89a4b.png')
                  }
                />
                <span className={`${styles['text-group_2']}`}>灯光</span>
              </div>
              <img
                className={`${styles['label_9']}`}
                src={
                  require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                }
              />
            </div>
            <div className={`${styles['box_6']} flex-col`}>
              <div className={`${styles['list_1']} flex-row`}>
                <div className={`${styles['image-text_3-0']} flex-col`}>
                  <img
                    className={`${styles['label_10-0']}`}
                    src={
                      require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                    }
                  />
                  <span className={`${styles['text-group_3-0']}`}>开关</span>
                </div>
                <div className={`${styles['image-text_3-1']} flex-col`}>
                  <img
                    className={`${styles['label_10-1']}`}
                    src={
                      require('./assets/img/SketchPngf2eef71558638aa18804e297035c38bd53708461b21a8d57b53bc15c097f1794.png')
                    }
                  />
                  <span className={`${styles['text-group_3-1']}`}>童锁｜开</span>
                </div>
              </div>
              <img
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['group_12']} flex-col`}>
            <div className={`${styles['block_9']} flex-row`}>
              <span className={`${styles['text_11']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_4']}`}
                src={
                  require('./assets/img/SketchPng6a27fa4042863b98a5a7a9bfc7c5865f310b56bfc9ccb2987cc8df89dc037218.png')
                }
              />
              <img
                className={`${styles['thumbnail_5']}`}
                src={
                  require('./assets/img/SketchPngb3f2f90ac369a580e677221ed428c4d27c1acf3525e5b76c694ac5a67c49f56c.png')
                }
              />
              <img
                className={`${styles['image_3']}`}
                src={
                  require('./assets/img/SketchPnge83bc6f2d9d38a6cfee9f97528a3e46d5006637b6a0dbe55250ad92528499a38.png')
                }
              />
            </div>
            <div className={`${styles['block_10']} flex-row`}>
              <img
                className={`${styles['thumbnail_6']}`}
                src={
                  require('./assets/img/SketchPng6ebc2e7ec02dcb74e970f5807decf7decc612503a36619059b58534d6135213e.png')
                }
              />
              <span className={`${styles['text_12']}`}>酒柜</span>
              <img
                className={`${styles['label_11']}`}
                src={
                  require('./assets/img/SketchPnged609f229d14643fd946a0689a5b3006b7aa0e6d02c8d7eb1b91a5d511e8686e.png')
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
