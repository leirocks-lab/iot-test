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
        <div className={`${styles['block_1']} flex-col`}>
          <div className={`${styles['box_3']} flex-col`}>
            <div className={`${styles['box_4']} flex-row`}>
              <span className={`${styles['text_1']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_1']}`}
                src={
                  require('./assets/img/SketchPng325d2fa1ece785fee4dc9ea589119c84874834835de860e1e928f7f1b13cda74.png')
                }
              />
              <img
                className={`${styles['thumbnail_2']}`}
                src={
                  require('./assets/img/SketchPng0285d8ecfbb0be2837579864402e9d18b2678f35cf8800fd65973ed603ebf378.png')
                }
              />
              <img
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPng665f1ec0b8e58ed4df63f45b45cad40290d2b813adaee780227ea5c660b1d6d5.png')
                }
              />
            </div>
            <div className={`${styles['box_5']} flex-row justify-between`}>
              <div className={`${styles['image-text_13']} flex-row justify-between`}>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPnge6fcad463d36720b441ae929a5c02665da1a6d1ddf3ab826195a070118f43bba.png')
                  }
                />
                <div className={`${styles['text-group_8']} flex-col`}>
                  <span className={`${styles['text_2']}`}>jack</span>
                  <span className={`${styles['text_3']}`}>1***9&#64;gmail.com</span>
                </div>
              </div>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/SketchPngea1688bd6c2574d8de0f173f435c8ee15534e0d00d808446cc22a9064d674a8b.png')
                }
              />
            </div>
            <div className={`${styles['list_3']} flex-col`}>
              <div className={`${styles['list-items_1-0']} flex-row`}>
                <div className={`${styles['image-text_14-0']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-0']}`}
                    src={
                      require('./assets/img/SketchPng49f81c4d5fa9f8310ae4a79b16598b4f5491882a54735ab4d3c7fbfa3520d529.png')
                    }
                  />
                  <span className={`${styles['text-group_2-0']}`}>房间管理</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-0']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-1']} flex-row`}>
                <div className={`${styles['image-text_14-1']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-1']}`}
                    src={
                      require('./assets/img/SketchPng85fe7d07593fc1920a0b4d0cb45d6a8678d936c109017895b558657d3872895a.png')
                    }
                  />
                  <span className={`${styles['text-group_2-1']}`}>语言</span>
                </div>
                <div className={`${styles['image-text_15-1']} flex-row justify-between`}>
                  <span className={`${styles['text-group_3-1']}`}>跟随系统</span>
                  <img
                    className={`${styles['thumbnail_3-1']}`}
                    src={
                      require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['list-items_1-2']} flex-row`}>
                <div className={`${styles['image-text_14-2']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-2']}`}
                    src={
                      require('./assets/img/SketchPng0ce7e0e23a249d8c85bd5936d6acff294b3c092ad601e809fc7e58d5c6f89a6b.png')
                    }
                  />
                  <span className={`${styles['text-group_2-2']}`}>关于</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-2']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-3']} flex-row`}>
                <div className={`${styles['image-text_14-3']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-3']}`}
                    src={
                      require('./assets/img/SketchPng2726c51b44e2661210bc26a58c09d2f355e3e6dc01d2b334a97d698c4509b656.png')
                    }
                  />
                  <span className={`${styles['text-group_2-3']}`}>联系我们</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-3']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-4']} flex-row`}>
                <div className={`${styles['image-text_14-4']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-4']}`}
                    src={
                      require('./assets/img/SketchPngc09d7eb9e329efe160bb010857c9110bada73491f2442a7029a889dfed178acf.png')
                    }
                  />
                  <span className={`${styles['text-group_2-4']}`}>问题反馈</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-4']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-5']} flex-row`}>
                <div className={`${styles['image-text_14-5']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-5']}`}
                    src={
                      require('./assets/img/SketchPngf0c619e1b1ff390962ac7c1ce212c09b1ac87b8e8a536237648fb57a81104512.png')
                    }
                  />
                  <span className={`${styles['text-group_2-5']}`}>访问官网</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-5']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-6']} flex-row`}>
                <div className={`${styles['image-text_14-6']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-6']}`}
                    src={
                      require('./assets/img/SketchPng0ee4c51237f5ce9060686a9b7808226fb7a85b5fccaf358f70b3f49117ce9e13.png')
                    }
                  />
                  <span className={`${styles['text-group_2-6']}`}>产品说明书</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-6']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-7']} flex-row`}>
                <div className={`${styles['image-text_14-7']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_2-7']}`}
                    src={
                      require('./assets/img/SketchPng2c188398301d87a25347eb573cc7ec8a6f5fcb8004e5da4ab39c7fc6a89d227c.png')
                    }
                  />
                  <span className={`${styles['text-group_2-7']}`}>常见问题</span>
                </div>
                <img
                  className={`${styles['thumbnail_4-7']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['section_3']} flex-col`}>
              <div className={`${styles['group_8']} flex-row`}>
                <div className={`${styles['image-text_16']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_3']}`}
                    src={
                      require('./assets/img/SketchPng6474be6d59434eb9665cd87383de0156e2aa3437fe119c6f4285372db3a1c22b.png')
                    }
                  />
                  <span className={`${styles['text-group_4']}`}>语音控制</span>
                </div>
              </div>
              <div className={`${styles['group_9']} flex-row justify-between`}>
                <div className={`${styles['box_1']} flex-row`}>
                  <div className={`${styles['image-text_17']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_5']}`}
                      src={
                        require('./assets/img/SketchPng7b5aa43899614644b92020e77846ebc6f18615a252d39bc3b2f787424bfbd36a.png')
                      }
                    />
                    <span className={`${styles['text-group_5']}`}>Alexa</span>
                  </div>
                </div>
                <div className={`${styles['box_2']} flex-row`}>
                  <div className={`${styles['image-text_18']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_6']}`}
                      src={
                        require('./assets/img/SketchPngb0313c7261831ab6863853011dfb1ec771bf6efaa44c2cc2f7af7841d929f922.png')
                      }
                    />
                    <span className={`${styles['text-group_6']}`}>Google&nbsp;Assi…</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['group_2']} flex-col`}>
            <div className={`${styles['group_3']} flex-row`}>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/SketchPng48a9f50f5e4d8344972048129c54511b85c43757f84f55d14177b59591e46ba6.png')
                }
              />
              <div className={`${styles['group_4']} flex-col`} />
              <img
                className={`${styles['label_5']}`}
                src={
                  require('./assets/img/SketchPng866cc62927075fa19b5d2d39a517aca7b82c2a03d2ddc26c5e1f7c8819270473.png')
                }
              />
            </div>
            <div className={`${styles['image-wrapper_1']} flex-col`}>
              <img
                className={`${styles['thumbnail_9']}`}
                src={
                  require('./assets/img/SketchPng633c60adbae3a8a8f02dbc076d49708f1cdf17ff1a3df1e544363c0ef825b701.png')
                }
              />
            </div>
            <img
              className={`${styles['image_5']}`}
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
