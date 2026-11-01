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
        <span className={`${styles['text_1']}`}>ANTARCTIC&nbsp;STAR&nbsp;115酒柜设备页UI设计</span>
        <div className={`${styles['group_1']} flex-col`}>
          <div className={`${styles['text-wrapper_1']} flex-row`}>
            <span className={`${styles['text_2']}`}>制冷</span>
            <span className={`${styles['text_3']}`}>童锁已开</span>
            <span className={`${styles['text_4']}`}>温度单位切换</span>
            <span className={`${styles['text_5']}`}>全展示-灯光已开</span>
            <span className={`${styles['text_6']}`}>关机</span>
            <span className={`${styles['text_7']}`}>离线</span>
          </div>
          <div className={`${styles['block_1']} flex-row`}>
            <img
              className={`${styles['image_1']}`}
              src={
                require('./assets/img/SketchPng6ba57cf78431012a03ed6136fc63a6f24659ccc2016ac711640e9b8fd0f33cee.png')
              }
            />
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPng603b8e4f680e75ca5d07934f2051893528284328377ac691e579dda0555fe1ea.png')
              }
            />
            <img
              className={`${styles['image_3']}`}
              src={
                require('./assets/img/SketchPng79ee2126a10aeaead95af778086edb482ca9be52bf7e4b53736835cb5d92d6e7.png')
              }
            />
            <div className={`${styles['box_1']} flex-col`}>
              <div className={`${styles['box_2']} flex-col`}>
                <div className={`${styles['box_3']} flex-row justify-between`}>
                  <div className={`${styles['image-text_1']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_1']}`}
                      src={
                        require('./assets/img/SketchPngbbab2f275822e2f202615c33ad80b1e73adf77ef2eb5ba5124dee98b37d89a4b.png')
                      }
                    />
                    <span className={`${styles['text-group_1']}`}>灯光</span>
                  </div>
                  <img
                    className={`${styles['label_2']}`}
                    src={
                      require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                    }
                  />
                </div>
                <div className={`${styles['box_4']} flex-row justify-between`}>
                  <div className={`${styles['block_2']} flex-col`}>
                    <div className={`${styles['image-wrapper_1']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_1']}`}
                        src={
                          require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text_8']}`}>白色</span>
                    <div className={`${styles['group_2']} flex-col`} />
                  </div>
                  <div className={`${styles['block_3']} flex-row`}>
                    <div className={`${styles['image-text_2']} flex-col justify-between`}>
                      <div className={`${styles['image-wrapper_2']} flex-col`}>
                        <img
                          className={`${styles['thumbnail_2']}`}
                          src={
                            require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                          }
                        />
                      </div>
                      <span className={`${styles['text-group_2']}`}>琥珀色</span>
                    </div>
                  </div>
                  <div className={`${styles['block_4']} flex-col`}>
                    <div className={`${styles['block_5']} flex-col`} />
                    <span className={`${styles['text_9']}`}>蓝色</span>
                    <div className={`${styles['block_6']} flex-col`}>
                      <div className={`${styles['image-wrapper_3']} flex-col justify-center`}>
                        <img
                          className={`${styles['thumbnail_3']}`}
                          src={
                            require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['box_5']} flex-col`}>
              <div className={`${styles['group_3']} flex-col`}>
                <div className={`${styles['box_6']} flex-row justify-between`}>
                  <div className={`${styles['image-text_3']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/SketchPng61af0f496f1099183b24386fb52986a3daef2701377c37194644016df91125ad.png')
                      }
                    />
                    <span className={`${styles['text-group_3']}`}>灯光</span>
                  </div>
                  <img
                    className={`${styles['label_4']}`}
                    src={
                      require('./assets/img/SketchPngf58837a724aaae3a74e02fb775aef1f8f6b5b822759a1bd67ffa6ca972480de9.png')
                    }
                  />
                </div>
                <div className={`${styles['box_7']} flex-row justify-between`}>
                  <div className={`${styles['group_4']} flex-col`}>
                    <div className={`${styles['image-wrapper_4']} flex-col`}>
                      <img
                        className={`${styles['thumbnail_4']}`}
                        src={
                          require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                        }
                      />
                    </div>
                    <span className={`${styles['text_10']}`}>白色</span>
                    <div className={`${styles['group_5']} flex-col`} />
                  </div>
                  <div className={`${styles['group_6']} flex-row`}>
                    <div className={`${styles['image-text_4']} flex-col justify-between`}>
                      <div className={`${styles['image-wrapper_5']} flex-col`}>
                        <img
                          className={`${styles['thumbnail_5']}`}
                          src={
                            require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                          }
                        />
                      </div>
                      <span className={`${styles['text-group_4']}`}>琥珀色</span>
                    </div>
                  </div>
                  <div className={`${styles['group_7']} flex-col`}>
                    <div className={`${styles['group_8']} flex-col`} />
                    <span className={`${styles['text_11']}`}>蓝色</span>
                    <div className={`${styles['group_9']} flex-col`}>
                      <div className={`${styles['image-wrapper_6']} flex-col justify-center`}>
                        <img
                          className={`${styles['thumbnail_6']}`}
                          src={
                            require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <img
              className={`${styles['image_4']}`}
              src={
                require('./assets/img/SketchPng14798d35bdb9f2a7e524f7b02c785d7ad15ff81bc25a556b6c84ace6551d0153.png')
              }
            />
          </div>
        </div>
        <div className={`${styles['group_10']} flex-row`}>
          <div className={`${styles['text-wrapper_2']}`}>
            <span className={`${styles['text_12']}`}>设备图：白</span>
            <span className={`${styles['text_13']}`}>灯</span>
          </div>
          <span className={`${styles['text_14']}`}>设备图：琥珀色灯</span>
          <span className={`${styles['text_15']}`}>设备图：蓝灯</span>
          <span className={`${styles['text_16']}`}>设备图：关机</span>
          <span className={`${styles['text_17']}`}>设备图：离线</span>
        </div>
        <div className={`${styles['group_11']} flex-row`}>
          <div className={`${styles['group_12']} flex-col`}>
            <div className={`${styles['box_8']} flex-col`} />
            <div className={`${styles['box_9']} flex-col`}>
              <div className={`${styles['box_10']} flex-row justify-between`}>
                <div className={`${styles['box_11']} flex-col`}>
                  <div className={`${styles['group_13']} flex-col`} />
                </div>
                <div className={`${styles['box_12']} flex-col`}>
                  <div className={`${styles['box_13']} flex-col`} />
                </div>
              </div>
              <div className={`${styles['image-wrapper_7']} flex-row justify-between`}>
                <img
                  className={`${styles['label_5']}`}
                  src={
                    require('./assets/img/SketchPnge7550b5ff882b3ca52b3af140a73e0df84218fa7f112fec4a703ba9ebdc570e4.png')
                  }
                />
                <img
                  className={`${styles['label_6']}`}
                  src={
                    require('./assets/img/SketchPnge7550b5ff882b3ca52b3af140a73e0df84218fa7f112fec4a703ba9ebdc570e4.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['group_14']} flex-col`}>
            <div className={`${styles['group_15']} flex-col`} />
            <div className={`${styles['group_16']} flex-col`}>
              <div className={`${styles['block_7']} flex-row justify-between`}>
                <div className={`${styles['box_14']} flex-col`}>
                  <div className={`${styles['block_8']} flex-col`} />
                </div>
                <div className={`${styles['box_15']} flex-col`}>
                  <div className={`${styles['group_17']} flex-col`} />
                </div>
              </div>
              <div className={`${styles['image-wrapper_8']} flex-row justify-between`}>
                <img
                  className={`${styles['label_7']}`}
                  src={
                    require('./assets/img/SketchPng8dcd90a5679ca2c41e3f40701d7c0ecc024990ed6040e40ecde04cd44553341d.png')
                  }
                />
                <img
                  className={`${styles['label_8']}`}
                  src={
                    require('./assets/img/SketchPng8dcd90a5679ca2c41e3f40701d7c0ecc024990ed6040e40ecde04cd44553341d.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['group_18']} flex-col`}>
            <div className={`${styles['group_19']} flex-col`} />
            <div className={`${styles['group_20']} flex-col`}>
              <div className={`${styles['group_21']} flex-row justify-between`}>
                <div className={`${styles['box_16']} flex-col`}>
                  <div className={`${styles['box_17']} flex-col`} />
                </div>
                <div className={`${styles['box_18']} flex-col`}>
                  <div className={`${styles['block_9']} flex-col`} />
                </div>
              </div>
              <div className={`${styles['image-wrapper_9']} flex-row justify-between`}>
                <img
                  className={`${styles['label_9']}`}
                  src={
                    require('./assets/img/SketchPng459541dfd00d57582df89e5a9479443c03c42e03eaff90f027ddfc3c0be0b9ad.png')
                  }
                />
                <img
                  className={`${styles['label_10']}`}
                  src={
                    require('./assets/img/SketchPng459541dfd00d57582df89e5a9479443c03c42e03eaff90f027ddfc3c0be0b9ad.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['group_22']} flex-col`}>
            <div className={`${styles['section_1']} flex-col`} />
            <div className={`${styles['section_2']} flex-col`}>
              <div className={`${styles['box_19']} flex-row justify-between`}>
                <div className={`${styles['block_10']} flex-col`}>
                  <div className={`${styles['box_20']} flex-row`}>
                    <div className={`${styles['group_23']} flex-col`} />
                  </div>
                  <div className={`${styles['box_21']} flex-row`}>
                    <div className={`${styles['group_24']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['block_11']} flex-col`}>
                  <div className={`${styles['block_12']} flex-row`}>
                    <div className={`${styles['group_25']} flex-col`} />
                  </div>
                  <div className={`${styles['block_13']} flex-row`}>
                    <div className={`${styles['box_22']} flex-col`} />
                  </div>
                </div>
              </div>
              <div className={`${styles['image-wrapper_10']} flex-row justify-between`}>
                <img
                  className={`${styles['label_11']}`}
                  src={
                    require('./assets/img/SketchPngd61e2135733a03b7b562b43167d83225a68d1ca6be2ddc00499ab64d5c03dc8a.png')
                  }
                />
                <img
                  className={`${styles['label_12']}`}
                  src={
                    require('./assets/img/SketchPngd61e2135733a03b7b562b43167d83225a68d1ca6be2ddc00499ab64d5c03dc8a.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['group_26']} flex-col`}>
            <div className={`${styles['section_3']} flex-col`} />
            <div className={`${styles['section_4']} flex-col`}>
              <div className={`${styles['group_27']} flex-row justify-between`}>
                <div className={`${styles['group_28']} flex-col`}>
                  <div className={`${styles['box_23']} flex-row`}>
                    <div className={`${styles['group_29']} flex-col`} />
                  </div>
                  <div className={`${styles['box_24']} flex-row`}>
                    <div className={`${styles['box_25']} flex-col`} />
                  </div>
                </div>
                <div className={`${styles['group_30']} flex-col`}>
                  <div className={`${styles['block_14']} flex-row`}>
                    <div className={`${styles['box_26']} flex-col`} />
                  </div>
                  <div className={`${styles['block_15']} flex-row`}>
                    <div className={`${styles['group_31']} flex-col`} />
                  </div>
                </div>
              </div>
              <div className={`${styles['image-wrapper_11']} flex-row justify-between`}>
                <img
                  className={`${styles['label_13']}`}
                  src={
                    require('./assets/img/SketchPngd61e2135733a03b7b562b43167d83225a68d1ca6be2ddc00499ab64d5c03dc8a.png')
                  }
                />
                <img
                  className={`${styles['label_14']}`}
                  src={
                    require('./assets/img/SketchPngd61e2135733a03b7b562b43167d83225a68d1ca6be2ddc00499ab64d5c03dc8a.png')
                  }
                />
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles['group_32']} flex-row`}>
          <div className={`${styles['box_27']} flex-col`}>
            <div className={`${styles['box_28']} flex-row justify-between`}>
              <div className={`${styles['image-text_5']} flex-row justify-between`}>
                <img
                  className={`${styles['label_15']}`}
                  src={
                    require('./assets/img/SketchPngbbab2f275822e2f202615c33ad80b1e73adf77ef2eb5ba5124dee98b37d89a4b.png')
                  }
                />
                <span className={`${styles['text-group_5']}`}>灯光</span>
              </div>
              <img
                className={`${styles['label_16']}`}
                src={
                  require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                }
              />
            </div>
            <div className={`${styles['box_29']} flex-row justify-between`}>
              <div className={`${styles['group_33']} flex-col`}>
                <div className={`${styles['section_5']} flex-col`}>
                  <div className={`${styles['image-wrapper_12']} flex-col justify-center`}>
                    <img
                      className={`${styles['thumbnail_7']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_18']}`}>白色</span>
                <div className={`${styles['section_6']} flex-col`} />
                <div className={`${styles['section_7']} flex-col`} />
              </div>
              <div className={`${styles['group_34']} flex-row`}>
                <div className={`${styles['image-text_6']} flex-col justify-between`}>
                  <div className={`${styles['image-wrapper_13']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_8']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text-group_6']}`}>琥珀色</span>
                </div>
              </div>
              <div className={`${styles['group_35']} flex-col`}>
                <div className={`${styles['group_36']} flex-col`} />
                <span className={`${styles['text_19']}`}>蓝色</span>
                <div className={`${styles['group_37']} flex-col`}>
                  <div className={`${styles['image-wrapper_14']} flex-col justify-center`}>
                    <img
                      className={`${styles['thumbnail_9']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['box_30']} flex-col`}>
            <div className={`${styles['box_31']} flex-row justify-between`}>
              <div className={`${styles['image-text_7']} flex-row justify-between`}>
                <img
                  className={`${styles['label_17']}`}
                  src={
                    require('./assets/img/SketchPngbbab2f275822e2f202615c33ad80b1e73adf77ef2eb5ba5124dee98b37d89a4b.png')
                  }
                />
                <span className={`${styles['text-group_7']}`}>灯光</span>
              </div>
              <img
                className={`${styles['label_18']}`}
                src={
                  require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                }
              />
            </div>
            <div className={`${styles['box_32']} flex-row justify-between`}>
              <div className={`${styles['box_33']} flex-col`}>
                <div className={`${styles['image-wrapper_15']} flex-col`}>
                  <img
                    className={`${styles['thumbnail_10']}`}
                    src={
                      require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                    }
                  />
                </div>
                <span className={`${styles['text_20']}`}>白色</span>
                <div className={`${styles['group_38']} flex-col`} />
              </div>
              <div className={`${styles['box_34']} flex-col`}>
                <div className={`${styles['box_35']} flex-col`} />
                <span className={`${styles['text_21']}`}>琥珀色</span>
                <div className={`${styles['image-wrapper_16']} flex-col`}>
                  <img
                    className={`${styles['thumbnail_11']}`}
                    src={
                      require('./assets/img/SketchPng0a9cae403295eb8259bef9615434062b018d5dd55c94540eb9f908b87f34a4ec.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_36']} flex-col`}>
                <div className={`${styles['block_16']} flex-col`} />
                <span className={`${styles['text_22']}`}>蓝色</span>
                <div className={`${styles['block_17']} flex-col`}>
                  <div className={`${styles['image-wrapper_17']} flex-col justify-center`}>
                    <img
                      className={`${styles['thumbnail_12']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['box_37']} flex-col`}>
            <div className={`${styles['group_39']} flex-row justify-between`}>
              <div className={`${styles['image-text_8']} flex-row justify-between`}>
                <img
                  className={`${styles['label_19']}`}
                  src={
                    require('./assets/img/SketchPngbbab2f275822e2f202615c33ad80b1e73adf77ef2eb5ba5124dee98b37d89a4b.png')
                  }
                />
                <span className={`${styles['text-group_8']}`}>灯光</span>
              </div>
              <img
                className={`${styles['label_20']}`}
                src={
                  require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                }
              />
            </div>
            <div className={`${styles['group_40']} flex-row justify-between`}>
              <div className={`${styles['section_8']} flex-col`}>
                <div className={`${styles['image-wrapper_18']} flex-col`}>
                  <img
                    className={`${styles['thumbnail_13']}`}
                    src={
                      require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                    }
                  />
                </div>
                <span className={`${styles['text_23']}`}>白色</span>
                <div className={`${styles['section_9']} flex-col`} />
              </div>
              <div className={`${styles['section_10']} flex-row`}>
                <div className={`${styles['image-text_9']} flex-col justify-between`}>
                  <div className={`${styles['image-wrapper_19']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_14']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text-group_9']}`}>琥珀色</span>
                </div>
              </div>
              <div className={`${styles['section_11']} flex-col`}>
                <div className={`${styles['group_41']} flex-col`} />
                <span className={`${styles['text_24']}`}>蓝色</span>
                <div className={`${styles['group_42']} flex-col`}>
                  <div className={`${styles['image-wrapper_20']} flex-col justify-center`}>
                    <img
                      className={`${styles['thumbnail_15']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['box_38']} flex-col`}>
            <div className={`${styles['box_39']} flex-row justify-between`}>
              <div className={`${styles['image-text_10']} flex-row justify-between`}>
                <img
                  className={`${styles['label_21']}`}
                  src={
                    require('./assets/img/SketchPng5e76b828e3a87da8474151757bf93d85f6cc6d9821255e9f4d2da8c489bba5a7.png')
                  }
                />
                <span className={`${styles['text-group_10']}`}>灯光</span>
              </div>
              <img
                className={`${styles['label_22']}`}
                src={
                  require('./assets/img/SketchPng6da0dcb1ecad42ad5fcf9c4f1898acd4bdb8b2f4b027bed542716307741e2433.png')
                }
              />
            </div>
            <div className={`${styles['box_40']} flex-row justify-between`}>
              <div className={`${styles['section_12']} flex-col`}>
                <div className={`${styles['image-wrapper_21']} flex-col`}>
                  <img
                    className={`${styles['thumbnail_16']}`}
                    src={
                      require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                    }
                  />
                </div>
                <span className={`${styles['text_25']}`}>白色</span>
                <div className={`${styles['box_41']} flex-col`} />
              </div>
              <div className={`${styles['section_13']} flex-row`}>
                <div className={`${styles['image-text_11']} flex-col justify-between`}>
                  <div className={`${styles['image-wrapper_22']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_17']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text-group_11']}`}>琥珀色</span>
                </div>
              </div>
              <div className={`${styles['section_14']} flex-row`}>
                <div className={`${styles['image-text_12']} flex-col justify-between`}>
                  <div className={`${styles['box_42']} flex-col`}>
                    <div className={`${styles['image-wrapper_23']} flex-col justify-center`}>
                      <img
                        className={`${styles['thumbnail_18']}`}
                        src={
                          require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_12']}`}>蓝色</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['box_43']} flex-col`}>
            <div className={`${styles['box_44']} flex-row justify-between`}>
              <div className={`${styles['image-text_13']} flex-row justify-between`}>
                <img
                  className={`${styles['label_23']}`}
                  src={
                    require('./assets/img/SketchPng5e76b828e3a87da8474151757bf93d85f6cc6d9821255e9f4d2da8c489bba5a7.png')
                  }
                />
                <span className={`${styles['text-group_13']}`}>灯光</span>
              </div>
              <img
                className={`${styles['label_24']}`}
                src={
                  require('./assets/img/SketchPngcf3917f6240893dbfc0b50dd53c2ccfd215c578cb1e4ed636fbcac1aaeff90cf.png')
                }
              />
            </div>
            <div className={`${styles['box_45']} flex-row justify-between`}>
              <div className={`${styles['box_46']} flex-col`}>
                <div className={`${styles['image-wrapper_24']} flex-col`}>
                  <img
                    className={`${styles['thumbnail_19']}`}
                    src={
                      require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                    }
                  />
                </div>
                <span className={`${styles['text_26']}`}>白色</span>
                <div className={`${styles['box_47']} flex-col`} />
              </div>
              <div className={`${styles['box_48']} flex-row`}>
                <div className={`${styles['image-text_14']} flex-col justify-between`}>
                  <div className={`${styles['image-wrapper_25']} flex-col`}>
                    <img
                      className={`${styles['thumbnail_20']}`}
                      src={
                        require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text-group_14']}`}>琥珀色</span>
                </div>
              </div>
              <div className={`${styles['box_49']} flex-row`}>
                <div className={`${styles['image-text_15']} flex-col justify-between`}>
                  <div className={`${styles['block_18']} flex-col`}>
                    <div className={`${styles['image-wrapper_26']} flex-col justify-center`}>
                      <img
                        className={`${styles['thumbnail_21']}`}
                        src={
                          require('./assets/img/SketchPng80c1dc15f157a898c6312cb2e8d95b5678b72b0205e2ab8ad8215715882faf43.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text-group_15']}`}>蓝色</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
