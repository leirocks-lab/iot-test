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
          <div className={`${styles['text-wrapper_1']} flex-col`}>
            <span className={`${styles['text_1']}`}>首页/添加设备操作流程</span>
          </div>
        </div>
        <div className={`${styles['group_2']} flex-row`}>
          <div className={`${styles['text-wrapper_2']} flex-col`}>
            <span className={`${styles['text_2']}`}>取消</span>
            <span className={`${styles['text_3']}`}>不保存，返回首页</span>
            <span className={`${styles['text_4']}`}>长按卡片3s</span>
          </div>
          <div className={`${styles['box_1']} flex-col`}>
            <div className={`${styles['group_3']} flex-row`}>
              <span className={`${styles['text_5']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_1']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_2']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_4']} flex-row`}>
              <div className={`${styles['box_2']} flex-col`}>
                <div className={`${styles['image-wrapper_1']} flex-col`}>
                  <img
                    className={`${styles['label_1']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_6']}`}>示例</span>
              <div className={`${styles['box_3']} flex-row`}>
                <div className={`${styles['box_4']} flex-col`} />
                <span className={`${styles['text_7']}`}>取消</span>
                <span className={`${styles['text_8']}`}>已选中&nbsp;2&nbsp;个设备</span>
                <span className={`${styles['text_9']}`}>完成</span>
                <img
                  className={`${styles['image_2']}`}
                  src={
                    require('./assets/img/SketchPngfa29b52e25d80f3ea713f31627f483e2816c1eefaba630f65ff13d47fd1ef19e.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['group_5']} flex-col`}>
              <div className={`${styles['group_6']} flex-row`}>
                <span className={`${styles['text_10']}`}>全屋</span>
                <span className={`${styles['text_11']}`}>客厅</span>
                <span className={`${styles['text_12']}`}>主卧</span>
                <span className={`${styles['text_13']}`}>次卧</span>
                <span className={`${styles['text_14']}`}>厨房</span>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng74216ec7c9b1b1772e35bf97c8404f45ccc65ab1637b347ebc7480476cb9066a.png')
                  }
                />
              </div>
              <div className={`${styles['group_7']} flex-row`}>
                <div className={`${styles['group_8']} flex-col`} />
              </div>
            </div>
            <div className={`${styles['group_9']} flex-row justify-between`}>
              <div className={`${styles['group_10']} flex-col`}>
                <div className={`${styles['box_5']} flex-row`}>
                  <div className={`${styles['group_11']} flex-col`} />
                  <div className={`${styles['group_12']} flex-col`}>
                    <div className={`${styles['image-wrapper_2']} flex-col`}>
                      <img
                        className={`${styles['image_3']}`}
                        src={
                          require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['image_4']}`}
                      src={
                        require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['label_3']}`}
                    src={
                      require('./assets/img/SketchPng91a3ce3938f57080964b3b4fcb7ff655cc1dff3a7efb2d8cfdb52f6f5436afc4.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_3']} flex-row`}>
                  <span className={`${styles['text_15']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_4']} flex-row`}>
                  <span className={`${styles['text_16']}`}>RW-400PRO</span>
                </div>
                <div className={`${styles['image-wrapper_3']} flex-row`}>
                  <img
                    className={`${styles['label_4']}`}
                    src={
                      require('./assets/img/SketchPng79f04ba3330c78658776474e35e989ee0106a6c7db6d6729806bf7fc533fd0b2.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['group_13']} flex-col`}>
                <div className={`${styles['group_14']} flex-row`}>
                  <div className={`${styles['group_15']} flex-col`} />
                  <div className={`${styles['group_16']} flex-col`}>
                    <div className={`${styles['box_6']} flex-col`}>
                      <div className={`${styles['section_1']} flex-col`}>
                        <div className={`${styles['section_2']} flex-col`} />
                        <img
                          className={`${styles['image_5']}`}
                          src={
                            require('./assets/img/SketchPngb81cf314c72f891e16f68e8b6ff9671e9c5bb4d9e6ddda9cb2b17c4dc7a3dd51.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_5']}`}
                    src={
                      require('./assets/img/SketchPngfdf89edfd7cfabdca51f2a289c31e732344ee68620045795b2d882c0f7e23408.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_5']} flex-row`}>
                  <span className={`${styles['text_17']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_6']} flex-row`}>
                  <span className={`${styles['text_18']}`}>RW-400PRO</span>
                </div>
                <div className={`${styles['image-wrapper_4']} flex-row`}>
                  <img
                    className={`${styles['label_6']}`}
                    src={
                      require('./assets/img/SketchPngca71eb7c7924364739af1d22449c33e80260e4c6b0b549d72f81a167aea1684c.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['label_7']}`}
                  src={
                    require('./assets/img/SketchPng44bb01bf9a054ab6f9d395939450c52d052c68bfaa3862a155d82316a2bd756c.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['group_17']} flex-row justify-between`}>
              <div className={`${styles['group_18']} flex-col`}>
                <div className={`${styles['group_19']} flex-row`}>
                  <div className={`${styles['box_7']} flex-col`} />
                  <div className={`${styles['box_8']} flex-col`}>
                    <div className={`${styles['box_9']} flex-col`}>
                      <div className={`${styles['box_10']} flex-col`}>
                        <div className={`${styles['block_1']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['image_6']}`}
                        src={
                          require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                        }
                      />
                    </div>
                  </div>
                  <img
                    className={`${styles['label_8']}`}
                    src={
                      require('./assets/img/SketchPngfdf89edfd7cfabdca51f2a289c31e732344ee68620045795b2d882c0f7e23408.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_7']} flex-row`}>
                  <span className={`${styles['text_19']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_8']} flex-row`}>
                  <span className={`${styles['text_20']}`}>RW-400PRO</span>
                </div>
                <div className={`${styles['image-wrapper_5']} flex-row`}>
                  <img
                    className={`${styles['label_9']}`}
                    src={
                      require('./assets/img/SketchPng79f04ba3330c78658776474e35e989ee0106a6c7db6d6729806bf7fc533fd0b2.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['label_10']}`}
                  src={
                    require('./assets/img/SketchPng44bb01bf9a054ab6f9d395939450c52d052c68bfaa3862a155d82316a2bd756c.png')
                  }
                />
              </div>
              <div className={`${styles['group_20']} flex-col`}>
                <div className={`${styles['group_21']} flex-row`}>
                  <div className={`${styles['group_22']} flex-col`} />
                  <div className={`${styles['group_23']} flex-col`}>
                    <div className={`${styles['group_24']} flex-col`}>
                      <div className={`${styles['block_2']} flex-col`}>
                        <div className={`${styles['section_3']} flex-col`} />
                        <img
                          className={`${styles['image_7']}`}
                          src={
                            require('./assets/img/SketchPng59562b7060e55504ec82150e457985187daf3590a7b780830a11ed869d912d28.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_11']}`}
                    src={
                      require('./assets/img/SketchPng91a3ce3938f57080964b3b4fcb7ff655cc1dff3a7efb2d8cfdb52f6f5436afc4.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_9']} flex-row`}>
                  <span className={`${styles['text_21']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_10']} flex-row`}>
                  <span className={`${styles['text_22']}`}>RW-400PRO</span>
                </div>
                <div className={`${styles['image-wrapper_6']} flex-row`}>
                  <img
                    className={`${styles['label_12']}`}
                    src={
                      require('./assets/img/SketchPng053ebb59259546d6db7059f5769837baa72e1ee5bc39db3d48e8431b7917ede7.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['group_25']} flex-row justify-between`}>
              <div className={`${styles['section_4']} flex-col`}>
                <div className={`${styles['box_11']} flex-row`}>
                  <div className={`${styles['section_5']} flex-col`} />
                  <div className={`${styles['section_6']} flex-col`}>
                    <div className={`${styles['image-wrapper_7']} flex-col`}>
                      <img
                        className={`${styles['image_8']}`}
                        src={
                          require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['image_9']}`}
                      src={
                        require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                      }
                    />
                  </div>
                  <img
                    className={`${styles['label_13']}`}
                    src={
                      require('./assets/img/SketchPng91a3ce3938f57080964b3b4fcb7ff655cc1dff3a7efb2d8cfdb52f6f5436afc4.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_11']} flex-row`}>
                  <span className={`${styles['text_23']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_12']} flex-row`}>
                  <span className={`${styles['text_24']}`}>RW-400PRO</span>
                </div>
                <div className={`${styles['image-wrapper_8']} flex-row`}>
                  <img
                    className={`${styles['label_14']}`}
                    src={
                      require('./assets/img/SketchPng0f728c92f8db016e82522b35d135b8a7766de556f595c46cbf2538d25afc8690.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['section_7']} flex-col`}>
                <div className={`${styles['group_26']} flex-row`}>
                  <div className={`${styles['group_27']} flex-col`} />
                  <div className={`${styles['group_28']} flex-col`}>
                    <div className={`${styles['group_29']} flex-col`}>
                      <div className={`${styles['box_12']} flex-col`}>
                        <div className={`${styles['box_13']} flex-col`} />
                        <img
                          className={`${styles['image_10']}`}
                          src={
                            require('./assets/img/SketchPngcea700e71d22280a10a5ef74c69717b08c5b88ae37c21dd3228adde3e03a88ce.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <img
                    className={`${styles['label_15']}`}
                    src={
                      require('./assets/img/SketchPnge1036d1c291ba0ef756afc6230f509cbbb9b380ab93a9ca4db3f983876840037.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_13']} flex-row`}>
                  <span className={`${styles['text_25']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_14']} flex-row`}>
                  <span className={`${styles['text_26']}`}>RW-400PRO</span>
                </div>
                <div className={`${styles['image-wrapper_9']} flex-row`}>
                  <img
                    className={`${styles['label_16']}`}
                    src={
                      require('./assets/img/SketchPngff26cf54829bc496ba1cedb4491b6c114d7c1fbcedb655f346e37c07025223d2.png')
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['box_14']} flex-col`}>
            <div className={`${styles['box_15']} flex-row`}>
              <span className={`${styles['text_27']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_4']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_11']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_16']} flex-row`}>
              <div className={`${styles['group_30']} flex-col`}>
                <div className={`${styles['image-wrapper_10']} flex-col`}>
                  <img
                    className={`${styles['label_17']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_28']}`}>示例</span>
              <img
                className={`${styles['image_12']}`}
                src={
                  require('./assets/img/SketchPngcd6f59ae29fec2fdd30c190898b5fc1b5cc5fd6d4643772ff66d2f63f7063883.png')
                }
              />
            </div>
            <div className={`${styles['box_17']} flex-col`}>
              <div className={`${styles['group_31']} flex-row`}>
                <span className={`${styles['text_29']}`}>全屋</span>
                <span className={`${styles['text_30']}`}>客厅</span>
                <span className={`${styles['text_31']}`}>主卧</span>
                <span className={`${styles['text_32']}`}>次卧</span>
                <span className={`${styles['text_33']}`}>厨房</span>
                <img
                  className={`${styles['label_18']}`}
                  src={
                    require('./assets/img/SketchPng74216ec7c9b1b1772e35bf97c8404f45ccc65ab1637b347ebc7480476cb9066a.png')
                  }
                />
              </div>
              <div className={`${styles['group_32']} flex-row`}>
                <div className={`${styles['block_3']} flex-col`} />
              </div>
              <img
                className={`${styles['image_13']}`}
                src={
                  require('./assets/img/SketchPngfa29b52e25d80f3ea713f31627f483e2816c1eefaba630f65ff13d47fd1ef19e.png')
                }
              />
            </div>
            <div className={`${styles['box_18']} flex-row justify-between`}>
              <div className={`${styles['group_33']} flex-col align-center`}>
                <div className={`${styles['section_8']} flex-col`}>
                  <div className={`${styles['group_34']} flex-row justify-between`}>
                    <div className={`${styles['group_35']} flex-col`} />
                    <div className={`${styles['group_36']} flex-col`}>
                      <div className={`${styles['image-wrapper_11']} flex-col`}>
                        <img
                          className={`${styles['image_14']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_15']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_15']} flex-row`}>
                    <span className={`${styles['text_34']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_16']} flex-row`}>
                    <span className={`${styles['text_35']}`}>Powered&nbsp;Off</span>
                  </div>
                  <div className={`${styles['image-wrapper_12']} flex-row`}>
                    <img
                      className={`${styles['label_19']}`}
                      src={
                        require('./assets/img/SketchPng79f04ba3330c78658776474e35e989ee0106a6c7db6d6729806bf7fc533fd0b2.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles['group_37']} flex-col`}>
                <div className={`${styles['section_9']} flex-col`}>
                  <div className={`${styles['block_4']} flex-row justify-between`}>
                    <div className={`${styles['section_10']} flex-col`} />
                    <div className={`${styles['section_11']} flex-col`}>
                      <div className={`${styles['group_38']} flex-col`}>
                        <div className={`${styles['group_39']} flex-col`}>
                          <div className={`${styles['section_12']} flex-col`} />
                          <img
                            className={`${styles['image_16']}`}
                            src={
                              require('./assets/img/SketchPng59562b7060e55504ec82150e457985187daf3590a7b780830a11ed869d912d28.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_17']} flex-row`}>
                    <span className={`${styles['text_36']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_18']} flex-row`}>
                    <span className={`${styles['text_37']}`}>Cooling</span>
                  </div>
                  <div className={`${styles['image-wrapper_13']} flex-row`}>
                    <img
                      className={`${styles['label_20']}`}
                      src={
                        require('./assets/img/SketchPng053ebb59259546d6db7059f5769837baa72e1ee5bc39db3d48e8431b7917ede7.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['box_19']} flex-row justify-between`}>
              <div className={`${styles['group_40']} flex-col`}>
                <div className={`${styles['box_20']} flex-col`}>
                  <div className={`${styles['block_5']} flex-row justify-between`}>
                    <div className={`${styles['block_6']} flex-col`} />
                    <div className={`${styles['block_7']} flex-col`}>
                      <div className={`${styles['image-wrapper_14']} flex-col`}>
                        <img
                          className={`${styles['image_17']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_18']}`}
                        src={
                          require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_19']} flex-row`}>
                    <span className={`${styles['text_38']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_20']} flex-row`}>
                    <span className={`${styles['text_39']}`}>Offline</span>
                  </div>
                  <div className={`${styles['image-wrapper_15']} flex-row`}>
                    <img
                      className={`${styles['label_21']}`}
                      src={
                        require('./assets/img/SketchPng0f728c92f8db016e82522b35d135b8a7766de556f595c46cbf2538d25afc8690.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles['group_41']} flex-col align-center`}>
                <div className={`${styles['box_21']} flex-col`}>
                  <div className={`${styles['block_8']} flex-row justify-between`}>
                    <div className={`${styles['group_42']} flex-col`} />
                    <div className={`${styles['group_43']} flex-col`}>
                      <div className={`${styles['group_44']} flex-col`}>
                        <div className={`${styles['block_9']} flex-col`}>
                          <div className={`${styles['box_22']} flex-col`} />
                          <img
                            className={`${styles['image_19']}`}
                            src={
                              require('./assets/img/SketchPngcea700e71d22280a10a5ef74c69717b08c5b88ae37c21dd3228adde3e03a88ce.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_21']} flex-row`}>
                    <span className={`${styles['text_40']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_22']} flex-row`}>
                    <span className={`${styles['text_41']}`}>Powered&nbsp;Off</span>
                  </div>
                  <div className={`${styles['image-wrapper_16']} flex-row`}>
                    <img
                      className={`${styles['label_22']}`}
                      src={
                        require('./assets/img/SketchPngff26cf54829bc496ba1cedb4491b6c114d7c1fbcedb655f346e37c07025223d2.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['box_23']} flex-row justify-between`}>
              <div className={`${styles['section_13']} flex-col`}>
                <div className={`${styles['group_45']} flex-row justify-between`}>
                  <div className={`${styles['section_14']} flex-col`} />
                  <div className={`${styles['section_15']} flex-col`}>
                    <div className={`${styles['image-wrapper_17']} flex-col`}>
                      <img
                        className={`${styles['image_20']}`}
                        src={
                          require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['image_21']}`}
                      src={
                        require('./assets/img/SketchPng006fa8f2d983261c2665736f6e6d263f52bcca4466fd7261da235d7737e91367.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-wrapper_23']} flex-row`}>
                  <span className={`${styles['text_42']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_24']} flex-row`}>
                  <span className={`${styles['text_43']}`}>Offline</span>
                </div>
                <div className={`${styles['image-wrapper_18']} flex-row`}>
                  <img
                    className={`${styles['label_23']}`}
                    src={
                      require('./assets/img/SketchPngc3015f2f0d4608d3c6c7b9a8d3351ca37a48b086ae8649d194d2a3ea817fe8d3.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['section_16']} flex-col`}>
                <div className={`${styles['box_24']} flex-row justify-between`}>
                  <div className={`${styles['box_25']} flex-col`} />
                  <div className={`${styles['box_26']} flex-col`}>
                    <div className={`${styles['box_27']} flex-col`}>
                      <div className={`${styles['box_28']} flex-col`}>
                        <div className={`${styles['box_29']} flex-col`} />
                        <div className={`${styles['box_30']} flex-col`} />
                        <img
                          className={`${styles['image_22']}`}
                          src={
                            require('./assets/img/SketchPng1fbdad6c45a7365870488667d66ced8f48cab4589722321ab5c28b59b1e02b5e.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${styles['text-wrapper_25']} flex-row`}>
                  <span className={`${styles['text_44']}`}>Air&nbsp;Conditioner</span>
                </div>
                <div className={`${styles['text-wrapper_26']} flex-row`}>
                  <span className={`${styles['text_45']}`}>Cooling</span>
                </div>
                <div className={`${styles['image-wrapper_19']} flex-row`}>
                  <img
                    className={`${styles['label_24']}`}
                    src={
                      require('./assets/img/SketchPng057c5e7aa73462c3d69786b5d82df97810a43945af335af428137ecf5e247087.png')
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['box_31']} flex-col`}>
            <div className={`${styles['box_32']} flex-row`}>
              <span className={`${styles['text_46']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_5']}`}
                src={
                  require('./assets/img/SketchPng89c6f1490f2227d14b83ba1be14ead3e5cbbb7e266b6c0ac507c94ce5528b3b5.png')
                }
              />
              <img
                className={`${styles['thumbnail_6']}`}
                src={
                  require('./assets/img/SketchPng30982b66cd20e214da5ec48481da26d777edf6febf52fc4d1ce7b4020c8bb01a.png')
                }
              />
              <img
                className={`${styles['image_23']}`}
                src={
                  require('./assets/img/SketchPng6de30a42516994eed0e85fcab2ee9880c36dc7bb6371d541190d032bb4240006.png')
                }
              />
            </div>
            <div className={`${styles['box_33']} flex-row`}>
              <div className={`${styles['block_10']} flex-col`}>
                <div className={`${styles['image-wrapper_20']} flex-col`}>
                  <img
                    className={`${styles['label_25']}`}
                    src={
                      require('./assets/img/SketchPng39e155d8d0d7698d4d956712ab51a8e91ba31a5ace2b569199af8a1ffc5d65d9.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_47']}`}>示例</span>
              <img
                className={`${styles['image_24']}`}
                src={
                  require('./assets/img/SketchPng2b7fd7f900543a4c4beb7f92e681381792a336a4e654e94392a635b51a504dff.png')
                }
              />
            </div>
            <div className={`${styles['box_34']} flex-col`}>
              <div className={`${styles['section_17']} flex-row`}>
                <span className={`${styles['text_48']}`}>全屋</span>
                <span className={`${styles['text_49']}`}>客厅</span>
                <span className={`${styles['text_50']}`}>主卧</span>
                <span className={`${styles['text_51']}`}>次卧</span>
                <span className={`${styles['text_52']}`}>厨房</span>
                <img
                  className={`${styles['label_26']}`}
                  src={
                    require('./assets/img/SketchPngd3888779ee08124aca86066f09ed3cc00f0a9b3e34e255b7bde36f3b78a66396.png')
                  }
                />
              </div>
              <div className={`${styles['section_18']} flex-row`}>
                <div className={`${styles['group_46']} flex-col`} />
              </div>
            </div>
            <img
              className={`${styles['image_25']}`}
              src={
                require('./assets/img/SketchPng6e3461b91d27c5beb34f21444b0c1a06d2329aa5e7e457aaec3963d581856329.png')
              }
            />
            <span className={`${styles['text_53']}`}>暂无设备，请添加</span>
            <img
              className={`${styles['image_26']}`}
              src={
                require('./assets/img/SketchPng6d0ef330b8c1361082033d917476c396afa70a5ca6ef3569b6ce6024b23340de.png')
              }
            />
            <div className={`${styles['box_35']} flex-col`}>
              <div className={`${styles['group_47']} flex-col`}>
                <div className={`${styles['text-wrapper_27']} flex-row justify-between`}>
                  <span className={`${styles['text_54']}`}>全屋</span>
                  <span className={`${styles['text_55']}`}>4</span>
                </div>
                <div className={`${styles['text-wrapper_28']} flex-row justify-between`}>
                  <span className={`${styles['text_56']}`}>客厅</span>
                  <span className={`${styles['text_57']}`}>2</span>
                </div>
                <div className={`${styles['text-wrapper_29']} flex-row justify-between`}>
                  <span className={`${styles['text_58']}`}>主卧</span>
                  <span className={`${styles['text_59']}`}>1</span>
                </div>
                <div className={`${styles['text-wrapper_30']} flex-row justify-between`}>
                  <span className={`${styles['text_60']}`}>次卧</span>
                  <span className={`${styles['text_61']}`}>0</span>
                </div>
                <div className={`${styles['text-wrapper_31']} flex-row justify-between`}>
                  <span className={`${styles['text_62']}`}>厨房</span>
                  <span className={`${styles['text_63']}`}>1</span>
                </div>
                <div className={`${styles['text-wrapper_32']} flex-row`}>
                  <span className={`${styles['text_64']}`}>房间管理</span>
                </div>
                <img
                  className={`${styles['image_27']}`}
                  src={
                    require('./assets/img/SketchPngfa29b52e25d80f3ea713f31627f483e2816c1eefaba630f65ff13d47fd1ef19e.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['box_36']} flex-col`}>
            <div className={`${styles['group_48']} flex-row`}>
              <span className={`${styles['text_65']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_7']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_8']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_28']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_49']} flex-row`}>
              <div className={`${styles['group_50']} flex-col`}>
                <div className={`${styles['image-wrapper_21']} flex-col`}>
                  <img
                    className={`${styles['label_27']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_66']}`}>示例</span>
              <div className={`${styles['group_51']} flex-row`}>
                <div className={`${styles['block_11']} flex-col`}>
                  <div className={`${styles['image-wrapper_22']} flex-col`}>
                    <img
                      className={`${styles['label_28']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_67']}`}>房间管理</span>
                <span className={`${styles['text_68']}`}>编辑</span>
                <img
                  className={`${styles['image_29']}`}
                  src={
                    require('./assets/img/SketchPngd8e3382b54dd0e8f862b8628f56370fe4ddbd198b220e50272e365f0960ddb49.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['group_52']} flex-row`}>
              <span className={`${styles['text_69']}`}>客厅</span>
              <span className={`${styles['text_70']}`}>2个设备</span>
              <img
                className={`${styles['label_29']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <div className={`${styles['image-wrapper_23']} flex-col`}>
                <img
                  className={`${styles['image_30']}`}
                  src={
                    require('./assets/img/SketchPng8e9f4c92fc37967d36620dfee0c659ae0d7da5667b68f7ddaed6928e20291383.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['group_53']} flex-row`}>
              <div className={`${styles['group_54']} flex-col`}>
                <div className={`${styles['image-wrapper_24']} flex-col`}>
                  <img
                    className={`${styles['image_31']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_30']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_71']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_55']} flex-row`}>
              <div className={`${styles['box_37']} flex-col`}>
                <div className={`${styles['image-wrapper_25']} flex-col`}>
                  <img
                    className={`${styles['image_32']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_31']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_72']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_56']} flex-row`}>
              <span className={`${styles['text_73']}`}>主卧</span>
              <span className={`${styles['text_74']}`}>0个设备</span>
              <img
                className={`${styles['label_32']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_9']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_57']} flex-row`}>
              <span className={`${styles['text_75']}`}>次卧</span>
              <span className={`${styles['text_76']}`}>0个设备</span>
              <img
                className={`${styles['label_33']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_10']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_58']} flex-row`}>
              <span className={`${styles['text_77']}`}>厨房</span>
              <span className={`${styles['text_78']}`}>0个设备</span>
              <img
                className={`${styles['label_34']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_11']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_59']} flex-row`}>
              <span className={`${styles['text_79']}`}>分享给我</span>
              <span className={`${styles['text_80']}`}>1个设备</span>
              <img
                className={`${styles['label_35']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_12']}`}
                src={
                  require('./assets/img/SketchPng946cf2d4a99ea4d6398f13f20c53b47b1dac93ec9948e49998d7282dc87cbbd5.png')
                }
              />
            </div>
            <div className={`${styles['group_60']} flex-row`}>
              <div className={`${styles['block_12']} flex-col`}>
                <div className={`${styles['image-wrapper_26']} flex-col`}>
                  <img
                    className={`${styles['image_33']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_36']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_81']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['text-wrapper_33']} flex-col`}>
              <span className={`${styles['text_82']}`}>添加房间</span>
            </div>
            <img
              className={`${styles['image_34']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['box_38']} flex-col`}>
            <div className={`${styles['block_13']} flex-row`}>
              <span className={`${styles['text_83']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_13']}`}
                src={
                  require('./assets/img/SketchPng89c6f1490f2227d14b83ba1be14ead3e5cbbb7e266b6c0ac507c94ce5528b3b5.png')
                }
              />
              <img
                className={`${styles['thumbnail_14']}`}
                src={
                  require('./assets/img/SketchPng30982b66cd20e214da5ec48481da26d777edf6febf52fc4d1ce7b4020c8bb01a.png')
                }
              />
              <img
                className={`${styles['image_35']}`}
                src={
                  require('./assets/img/SketchPng6de30a42516994eed0e85fcab2ee9880c36dc7bb6371d541190d032bb4240006.png')
                }
              />
            </div>
            <div className={`${styles['block_14']} flex-row`}>
              <div className={`${styles['section_19']} flex-col`}>
                <div className={`${styles['image-wrapper_27']} flex-col`}>
                  <img
                    className={`${styles['label_37']}`}
                    src={
                      require('./assets/img/SketchPng39e155d8d0d7698d4d956712ab51a8e91ba31a5ace2b569199af8a1ffc5d65d9.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_84']}`}>示例</span>
              <div className={`${styles['section_20']} flex-row`}>
                <div className={`${styles['group_61']} flex-col`}>
                  <div className={`${styles['image-wrapper_28']} flex-col`}>
                    <img
                      className={`${styles['label_38']}`}
                      src={
                        require('./assets/img/SketchPng58c0c1329b20349820072727ba5565137f2f9a7077bf531d52978dfdfaaefbf8.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_85']}`}>房间管理</span>
                <span className={`${styles['text_86']}`}>编辑</span>
              </div>
            </div>
            <div className={`${styles['block_15']} flex-row`}>
              <span className={`${styles['text_87']}`}>客厅</span>
              <span className={`${styles['text_88']}`}>2个设备</span>
              <img
                className={`${styles['label_39']}`}
                src={
                  require('./assets/img/SketchPng4fdd2b38d1baf7a3c5dbbdbd8c1ea65a2fa3908ae4d9755767277c968015ab72.png')
                }
              />
              <img
                className={`${styles['thumbnail_15']}`}
                src={
                  require('./assets/img/SketchPnge06f02c3817136ad8e3ff09e00984ef045a3512e9dc43cf46114308ecc9a065d.png')
                }
              />
            </div>
            <div className={`${styles['block_16']} flex-row`}>
              <div className={`${styles['group_62']} flex-col`}>
                <div className={`${styles['image-wrapper_29']} flex-col`}>
                  <img
                    className={`${styles['image_36']}`}
                    src={
                      require('./assets/img/SketchPng3377ea9cd1715ea3e9f671aa9c5935fd7c50bd0fb2363e6903daaa3cd118d138.png')
                    }
                  />
                  <img
                    className={`${styles['label_40']}`}
                    src={
                      require('./assets/img/SketchPngac0d92b67afb7a7c1bcab984c35349a1e12aa64d2baa09ae02c990008d4f176d.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_89']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['block_17']} flex-row`}>
              <div className={`${styles['box_39']} flex-col`}>
                <div className={`${styles['image-wrapper_30']} flex-col`}>
                  <img
                    className={`${styles['image_37']}`}
                    src={
                      require('./assets/img/SketchPng3377ea9cd1715ea3e9f671aa9c5935fd7c50bd0fb2363e6903daaa3cd118d138.png')
                    }
                  />
                  <img
                    className={`${styles['label_41']}`}
                    src={
                      require('./assets/img/SketchPngac0d92b67afb7a7c1bcab984c35349a1e12aa64d2baa09ae02c990008d4f176d.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_90']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['block_18']} flex-row`}>
              <span className={`${styles['text_91']}`}>主卧</span>
              <span className={`${styles['text_92']}`}>0个设备</span>
              <img
                className={`${styles['label_42']}`}
                src={
                  require('./assets/img/SketchPng4fdd2b38d1baf7a3c5dbbdbd8c1ea65a2fa3908ae4d9755767277c968015ab72.png')
                }
              />
              <img
                className={`${styles['thumbnail_16']}`}
                src={
                  require('./assets/img/SketchPng5de62ec3e608e6a37a2ded78702163c17513bfabda91fdc7238adb585014d7d1.png')
                }
              />
            </div>
            <div className={`${styles['block_19']} flex-row`}>
              <span className={`${styles['text_93']}`}>次卧</span>
              <span className={`${styles['text_94']}`}>0个设备</span>
              <img
                className={`${styles['label_43']}`}
                src={
                  require('./assets/img/SketchPng4fdd2b38d1baf7a3c5dbbdbd8c1ea65a2fa3908ae4d9755767277c968015ab72.png')
                }
              />
              <img
                className={`${styles['thumbnail_17']}`}
                src={
                  require('./assets/img/SketchPng5de62ec3e608e6a37a2ded78702163c17513bfabda91fdc7238adb585014d7d1.png')
                }
              />
            </div>
            <img
              className={`${styles['image_38']}`}
              src={
                require('./assets/img/SketchPng17410692f28230a9d4bf3072e0fc7773bceea837112a01ec2711588919ba73ad.png')
              }
            />
            <div className={`${styles['block_20']} flex-col`}>
              <div className={`${styles['section_21']} flex-col`}>
                <div className={`${styles['text-wrapper_34']} flex-col`}>
                  <span className={`${styles['text_95']}`}>房间名称</span>
                </div>
                <div className={`${styles['text-wrapper_35']} flex-col`}>
                  <span className={`${styles['text_96']}`}>请输入房间名称</span>
                </div>
                <div className={`${styles['box_40']} flex-col`} />
                <div className={`${styles['box_41']} flex-row`}>
                  <div className={`${styles['text-wrapper_36']} flex-col`}>
                    <span className={`${styles['text_97']}`}>取消</span>
                  </div>
                  <div className={`${styles['text-wrapper_37']} flex-col`}>
                    <span className={`${styles['text_98']}`}>确定</span>
                  </div>
                </div>
              </div>
              <img
                className={`${styles['image_39']}`}
                src={
                  require('./assets/img/SketchPng9acc30789ec0c4c6511a18f824c489196e1c1a91656e3d8181479a6d54ad3cbd.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['box_42']} flex-col`}>
            <div className={`${styles['group_63']} flex-row`}>
              <span className={`${styles['text_99']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_18']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_19']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_40']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_64']} flex-row`}>
              <div className={`${styles['section_22']} flex-col`}>
                <div className={`${styles['image-wrapper_31']} flex-col`}>
                  <img
                    className={`${styles['label_44']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_100']}`}>示例</span>
              <div className={`${styles['section_23']} flex-row`}>
                <div className={`${styles['block_21']} flex-col`} />
                <span className={`${styles['text_101']}`}>取消</span>
                <span className={`${styles['text_102']}`}>房间管理</span>
                <span className={`${styles['text_103']}`}>完成</span>
              </div>
            </div>
            <div className={`${styles['group_65']} flex-row`}>
              <img
                className={`${styles['label_45']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_104']}`}>客厅</span>
              <span className={`${styles['text_105']}`}>2个设备</span>
              <img
                className={`${styles['thumbnail_20']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['group_66']} flex-row`}>
              <div className={`${styles['section_24']} flex-col`}>
                <div className={`${styles['image-wrapper_32']} flex-col`}>
                  <img
                    className={`${styles['image_41']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_46']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_106']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_21']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['group_67']} flex-row`}>
              <div className={`${styles['box_43']} flex-col`}>
                <div className={`${styles['image-wrapper_33']} flex-col`}>
                  <img
                    className={`${styles['image_42']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_47']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_107']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_22']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
              <div className={`${styles['box_44']} flex-col`}>
                <div className={`${styles['box_45']} flex-row`}>
                  <img
                    className={`${styles['label_48']}`}
                    src={
                      require('./assets/img/SketchPngda81e6c602e87714332705c882c4adbd96024fe75663cc2da65ed36483c5e261.png')
                    }
                  />
                  <span className={`${styles['text_108']}`}>Air&nbsp;Conditioner</span>
                  <img
                    className={`${styles['thumbnail_23']}`}
                    src={
                      require('./assets/img/SketchPng6d9f5f6b6b90b2fcd248154ff58888e83a2687c73f2d3a9c9699532707dffe5b.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_24']}`}
                    src={
                      require('./assets/img/SketchPng2a6a6ee4251e2d872b4e563b0ee4402afc854309bdfc1c31add407e07fba45c2.png')
                    }
                  />
                  <div className={`${styles['section_25']} flex-col`}>
                    <div className={`${styles['image-wrapper_34']} flex-col`}>
                      <img
                        className={`${styles['image_43']}`}
                        src={
                          require('./assets/img/SketchPng5e408e9b0ed6b756caf9e58870f34509f86c0e747c24041f1bc9cb83d535706b.png')
                        }
                      />
                      <img
                        className={`${styles['label_49']}`}
                        src={
                          require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['group_68']} flex-row`}>
              <img
                className={`${styles['label_50']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_109']}`}>主卧</span>
              <span className={`${styles['text_110']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_25']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['group_69']} flex-row`}>
              <img
                className={`${styles['label_51']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_111']}`}>次卧</span>
              <span className={`${styles['text_112']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_26']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['group_70']} flex-row`}>
              <img
                className={`${styles['label_52']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_113']}`}>厨房</span>
              <span className={`${styles['text_114']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_27']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['group_71']} flex-row`}>
              <img
                className={`${styles['label_53']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_115']}`}>分享给我</span>
              <span className={`${styles['text_116']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_28']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['group_72']} flex-col`} />
            <img
              className={`${styles['image_44']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_73']} flex-col`} />
          </div>
          <img
            className={`${styles['label_54']}`}
            src={
              require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
            }
          />
          <div className={`${styles['box_46']} flex-col`}>
            <div className={`${styles['group_74']} flex-row`}>
              <span className={`${styles['text_117']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_29']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_30']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_45']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['group_75']} flex-row`}>
              <div className={`${styles['group_76']} flex-col`}>
                <div className={`${styles['image-wrapper_35']} flex-col`}>
                  <img
                    className={`${styles['label_55']}`}
                    src={
                      require('./assets/img/SketchPng1ef33eb40cd186e688b840f0a61e208840777f201c27dbf9dad9451f8de86bda.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_118']}`}>示例</span>
              <div className={`${styles['group_77']} flex-row`}>
                <div className={`${styles['group_78']} flex-col`} />
                <span className={`${styles['text_119']}`}>取消</span>
                <span className={`${styles['text_120']}`}>房间管理</span>
                <span className={`${styles['text_121']}`}>完成</span>
              </div>
            </div>
            <div className={`${styles['group_79']} flex-row`}>
              <img
                className={`${styles['label_56']}`}
                src={
                  require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                }
              />
              <span className={`${styles['text_122']}`}>客厅</span>
              <span className={`${styles['text_123']}`}>3个设备</span>
              <img
                className={`${styles['thumbnail_31']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <div className={`${styles['group_80']} flex-row`}>
              <div className={`${styles['section_26']} flex-col`}>
                <div className={`${styles['image-wrapper_36']} flex-col`}>
                  <img
                    className={`${styles['image_46']}`}
                    src={
                      require('./assets/img/SketchPng7af9bfad0806ef6c118dc719be5364aeafa8fb09aa0f3a7733e110b736d184cd.png')
                    }
                  />
                  <img
                    className={`${styles['label_57']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_124']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_32']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <div className={`${styles['group_81']} flex-row`}>
              <div className={`${styles['box_47']} flex-col`}>
                <div className={`${styles['image-wrapper_37']} flex-col`}>
                  <img
                    className={`${styles['image_47']}`}
                    src={
                      require('./assets/img/SketchPng7af9bfad0806ef6c118dc719be5364aeafa8fb09aa0f3a7733e110b736d184cd.png')
                    }
                  />
                  <img
                    className={`${styles['label_58']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_125']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_33']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <div className={`${styles['group_82']} flex-row`}>
              <div className={`${styles['box_48']} flex-col`}>
                <div className={`${styles['image-wrapper_38']} flex-col`}>
                  <img
                    className={`${styles['image_48']}`}
                    src={
                      require('./assets/img/SketchPng7af9bfad0806ef6c118dc719be5364aeafa8fb09aa0f3a7733e110b736d184cd.png')
                    }
                  />
                  <img
                    className={`${styles['label_59']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_126']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_34']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <div className={`${styles['group_83']} flex-row justify-between`}>
              <div className={`${styles['group_84']} flex-row`}>
                <span className={`${styles['text_127']}`}>0个设备</span>
                <img
                  className={`${styles['thumbnail_35']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
              <div className={`${styles['group_85']} flex-col`}>
                <span className={`${styles['text_128']}`}>删除</span>
                <img
                  className={`${styles['image_49']}`}
                  src={
                    require('./assets/img/SketchPng103fddc9c4958add176175b16aa343168892992bac757ded370638e197a7b37c.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['group_86']} flex-row`}>
              <img
                className={`${styles['label_60']}`}
                src={
                  require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                }
              />
              <span className={`${styles['text_129']}`}>次卧</span>
              <span className={`${styles['text_130']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_36']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <div className={`${styles['group_87']} flex-row`}>
              <img
                className={`${styles['label_61']}`}
                src={
                  require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                }
              />
              <span className={`${styles['text_131']}`}>厨房</span>
              <span className={`${styles['text_132']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_37']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <div className={`${styles['group_88']} flex-row`}>
              <img
                className={`${styles['label_62']}`}
                src={
                  require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                }
              />
              <span className={`${styles['text_133']}`}>分享给我</span>
              <span className={`${styles['text_134']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_38']}`}
                src={
                  require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                }
              />
            </div>
            <img
              className={`${styles['image_50']}`}
              src={
                require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
              }
            />
            <img
              className={`${styles['image_51']}`}
              src={
                require('./assets/img/SketchPng5bc241860d08a665332fcf24a5ec03eee18c53563e360a829de6ff7eefeb9ac0.png')
              }
            />
          </div>
          <div className={`${styles['box_49']} flex-col`}>
            <div className={`${styles['section_27']} flex-row`}>
              <span className={`${styles['text_135']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_39']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_40']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_52']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['section_28']} flex-row`}>
              <div className={`${styles['section_29']} flex-col`}>
                <div className={`${styles['image-wrapper_39']} flex-col`}>
                  <img
                    className={`${styles['label_63']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_136']}`}>示例</span>
              <div className={`${styles['section_30']} flex-row`}>
                <div className={`${styles['box_50']} flex-col`} />
                <span className={`${styles['text_137']}`}>取消</span>
                <span className={`${styles['text_138']}`}>房间管理</span>
                <span className={`${styles['text_139']}`}>完成</span>
                <img
                  className={`${styles['image_53']}`}
                  src={
                    require('./assets/img/SketchPng103fddc9c4958add176175b16aa343168892992bac757ded370638e197a7b37c.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['section_31']} flex-row`}>
              <img
                className={`${styles['label_64']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_140']}`}>客厅</span>
              <span className={`${styles['text_141']}`}>3个设备</span>
              <img
                className={`${styles['thumbnail_41']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['section_32']} flex-row`}>
              <div className={`${styles['box_51']} flex-col`}>
                <div className={`${styles['image-wrapper_40']} flex-col`}>
                  <img
                    className={`${styles['image_54']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_65']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_142']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_42']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['section_33']} flex-row`}>
              <div className={`${styles['box_52']} flex-col`}>
                <div className={`${styles['image-wrapper_41']} flex-col`}>
                  <img
                    className={`${styles['image_55']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_66']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_143']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_43']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['section_34']} flex-row`}>
              <div className={`${styles['group_89']} flex-col`}>
                <div className={`${styles['image-wrapper_42']} flex-col`}>
                  <img
                    className={`${styles['image_56']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_67']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_144']}`}>Air&nbsp;Conditioner</span>
              <img
                className={`${styles['thumbnail_44']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['section_35']} flex-row`}>
              <img
                className={`${styles['label_68']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_145']}`}>次卧</span>
              <span className={`${styles['text_146']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_45']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['section_36']} flex-row`}>
              <img
                className={`${styles['label_69']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_147']}`}>厨房</span>
              <span className={`${styles['text_148']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_46']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <div className={`${styles['section_37']} flex-row`}>
              <img
                className={`${styles['label_70']}`}
                src={
                  require('./assets/img/SketchPng15ad2af2038349868fa7d2fbe30d41e931a6f7d1a11d9ce5033d6a4ad71a7927.png')
                }
              />
              <span className={`${styles['text_149']}`}>分享给我</span>
              <span className={`${styles['text_150']}`}>0个设备</span>
              <img
                className={`${styles['thumbnail_47']}`}
                src={
                  require('./assets/img/SketchPng97a84bb7128da2e47504e4a9a065aa12e86d8e755a9967a49794f6602eb5fa38.png')
                }
              />
            </div>
            <img
              className={`${styles['image_57']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['text-wrapper_38']} flex-col`}>
              <span className={`${styles['text_151']}`}>删除成功</span>
            </div>
          </div>
          <span className={`${styles['text_152']}`}>保存</span>
          <div className={`${styles['box_53']} flex-col`}>
            <div className={`${styles['group_90']} flex-row`}>
              <span className={`${styles['text_153']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_48']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_49']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_58']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_91']} flex-row`}>
              <div className={`${styles['group_92']} flex-col`}>
                <div className={`${styles['image-wrapper_43']} flex-col`}>
                  <img
                    className={`${styles['label_71']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_154']}`}>示例</span>
              <div className={`${styles['group_93']} flex-row`}>
                <div className={`${styles['box_54']} flex-col`}>
                  <div className={`${styles['image-wrapper_44']} flex-col`}>
                    <img
                      className={`${styles['label_72']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_155']}`}>房间管理</span>
                <span className={`${styles['text_156']}`}>编辑</span>
              </div>
            </div>
            <div className={`${styles['group_94']} flex-row`}>
              <span className={`${styles['text_157']}`}>客厅</span>
              <span className={`${styles['text_158']}`}>3个设备</span>
              <img
                className={`${styles['label_73']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_50']}`}
                src={
                  require('./assets/img/SketchPng946cf2d4a99ea4d6398f13f20c53b47b1dac93ec9948e49998d7282dc87cbbd5.png')
                }
              />
            </div>
            <div className={`${styles['group_95']} flex-row`}>
              <div className={`${styles['box_55']} flex-col`}>
                <div className={`${styles['image-wrapper_45']} flex-col`}>
                  <img
                    className={`${styles['image_59']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_74']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_159']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_96']} flex-row`}>
              <div className={`${styles['group_97']} flex-col`}>
                <div className={`${styles['image-wrapper_46']} flex-col`}>
                  <img
                    className={`${styles['image_60']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_75']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_160']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_98']} flex-row`}>
              <div className={`${styles['group_99']} flex-col`}>
                <div className={`${styles['image-wrapper_47']} flex-col`}>
                  <img
                    className={`${styles['image_61']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_76']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_161']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_100']} flex-row`}>
              <span className={`${styles['text_162']}`}>次卧</span>
              <span className={`${styles['text_163']}`}>0个设备</span>
              <img
                className={`${styles['label_77']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_51']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_101']} flex-row`}>
              <span className={`${styles['text_164']}`}>厨房</span>
              <span className={`${styles['text_165']}`}>0个设备</span>
              <img
                className={`${styles['label_78']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_52']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_102']} flex-row`}>
              <span className={`${styles['text_166']}`}>分享给我</span>
              <span className={`${styles['text_167']}`}>1个设备</span>
              <img
                className={`${styles['label_79']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_53']}`}
                src={
                  require('./assets/img/SketchPng946cf2d4a99ea4d6398f13f20c53b47b1dac93ec9948e49998d7282dc87cbbd5.png')
                }
              />
            </div>
            <div className={`${styles['group_103']} flex-row`}>
              <span className={`${styles['text_168']}`}>书房</span>
              <span className={`${styles['text_169']}`}>0个设备</span>
              <img
                className={`${styles['label_80']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_54']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_104']} flex-row`}>
              <span className={`${styles['text_170']}`}>餐厅</span>
              <span className={`${styles['text_171']}`}>0个设备</span>
              <img
                className={`${styles['label_81']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_55']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_105']} flex-col`}>
              <span className={`${styles['text_172']}`}>添加房间</span>
              <img
                className={`${styles['image_62']}`}
                src={
                  require('./assets/img/SketchPng05a7e59a54c400a4795fe5a217e57fe5000368c98eb5cd1c304d9180f1b963ae.png')
                }
              />
            </div>
            <img
              className={`${styles['image_63']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['box_56']} flex-col`}>
            <div className={`${styles['block_22']} flex-row`}>
              <span className={`${styles['text_173']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_56']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_57']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_64']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['block_23']} flex-row`}>
              <div className={`${styles['block_24']} flex-col`}>
                <div className={`${styles['image-wrapper_48']} flex-col`}>
                  <img
                    className={`${styles['label_82']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_174']}`}>示例</span>
              <div className={`${styles['block_25']} flex-row`}>
                <div className={`${styles['group_106']} flex-col`}>
                  <div className={`${styles['image-wrapper_49']} flex-col`}>
                    <img
                      className={`${styles['label_83']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_175']}`}>添加房间&nbsp;2个</span>
                <span className={`${styles['text_176']}`}>确认</span>
              </div>
            </div>
            <div className={`${styles['text-wrapper_39']} flex-row justify-between`}>
              <span className={`${styles['text_177']}`}>房间名称</span>
              <span className={`${styles['text_178']}`}>0/20</span>
            </div>
            <div className={`${styles['block_26']} flex-row`}>
              <span className={`${styles['text_179']}`}>请输入房间名称</span>
              <img
                className={`${styles['label_84']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
            </div>
            <span className={`${styles['text_180']}`}>推荐名称</span>
            <div className={`${styles['text-wrapper_40']} flex-col`}>
              <span className={`${styles['text_181']}`}>书房</span>
            </div>
            <div className={`${styles['text-wrapper_41']} flex-col`}>
              <span className={`${styles['text_182']}`}>儿童房</span>
            </div>
            <div className={`${styles['block_27']} flex-row`}>
              <span className={`${styles['text_183']}`}>餐厅</span>
              <img
                className={`${styles['label_85']}`}
                src={
                  require('./assets/img/SketchPng4a71f3dd6e1c3ac044d3c14c9dada3f34e8da140ca258e976ffdb816dfd3ebcd.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_42']} flex-col`}>
              <span className={`${styles['text_184']}`}>阳台</span>
            </div>
            <div className={`${styles['text-wrapper_43']} flex-col`}>
              <span className={`${styles['text_185']}`}>浴室</span>
            </div>
            <div className={`${styles['text-wrapper_44']} flex-col`}>
              <span className={`${styles['text_186']}`}>地下室</span>
            </div>
            <img
              className={`${styles['image_65']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <div className={`${styles['box_57']} flex-col`}>
            <div className={`${styles['group_107']} flex-row`}>
              <span className={`${styles['text_187']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_58']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_59']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_66']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['group_108']} flex-row`}>
              <div className={`${styles['box_58']} flex-col`}>
                <div className={`${styles['image-wrapper_50']} flex-col`}>
                  <img
                    className={`${styles['label_86']}`}
                    src={
                      require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_188']}`}>示例</span>
              <div className={`${styles['box_59']} flex-row`}>
                <div className={`${styles['box_60']} flex-col`}>
                  <div className={`${styles['image-wrapper_51']} flex-col`}>
                    <img
                      className={`${styles['label_87']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_189']}`}>房间管理</span>
                <span className={`${styles['text_190']}`}>编辑</span>
              </div>
            </div>
            <div className={`${styles['group_109']} flex-row`}>
              <span className={`${styles['text_191']}`}>客厅</span>
              <span className={`${styles['text_192']}`}>3个设备</span>
              <img
                className={`${styles['label_88']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_60']}`}
                src={
                  require('./assets/img/SketchPng946cf2d4a99ea4d6398f13f20c53b47b1dac93ec9948e49998d7282dc87cbbd5.png')
                }
              />
            </div>
            <div className={`${styles['group_110']} flex-row`}>
              <div className={`${styles['section_38']} flex-col`}>
                <div className={`${styles['image-wrapper_52']} flex-col`}>
                  <img
                    className={`${styles['image_67']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_89']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_193']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_111']} flex-row`}>
              <div className={`${styles['section_39']} flex-col`}>
                <div className={`${styles['image-wrapper_53']} flex-col`}>
                  <img
                    className={`${styles['image_68']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_90']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_194']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_112']} flex-row`}>
              <div className={`${styles['block_28']} flex-col`}>
                <div className={`${styles['image-wrapper_54']} flex-col`}>
                  <img
                    className={`${styles['image_69']}`}
                    src={
                      require('./assets/img/SketchPng0413a29a3c2f415e9580730765799f710dbeac1808b2dd8656758c009af58022.png')
                    }
                  />
                  <img
                    className={`${styles['label_91']}`}
                    src={
                      require('./assets/img/SketchPng231b6fa034cb042db9f2840e056fbe14689753c9a4e6d73cf78c83e1602f3185.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['text_195']}`}>Air&nbsp;Conditioner</span>
            </div>
            <div className={`${styles['group_113']} flex-row`}>
              <span className={`${styles['text_196']}`}>次卧</span>
              <span className={`${styles['text_197']}`}>0个设备</span>
              <img
                className={`${styles['label_92']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_61']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_114']} flex-row`}>
              <span className={`${styles['text_198']}`}>厨房</span>
              <span className={`${styles['text_199']}`}>0个设备</span>
              <img
                className={`${styles['label_93']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_62']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
              <div className={`${styles['text-wrapper_45']} flex-col`}>
                <span className={`${styles['text_200']}`}>添加成功</span>
              </div>
            </div>
            <div className={`${styles['group_115']} flex-row`}>
              <span className={`${styles['text_201']}`}>分享给我</span>
              <span className={`${styles['text_202']}`}>1个设备</span>
              <img
                className={`${styles['label_94']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_63']}`}
                src={
                  require('./assets/img/SketchPng946cf2d4a99ea4d6398f13f20c53b47b1dac93ec9948e49998d7282dc87cbbd5.png')
                }
              />
            </div>
            <div className={`${styles['group_116']} flex-row`}>
              <span className={`${styles['text_203']}`}>书房</span>
              <span className={`${styles['text_204']}`}>0个设备</span>
              <img
                className={`${styles['label_95']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_64']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['group_117']} flex-row`}>
              <span className={`${styles['text_205']}`}>餐厅</span>
              <span className={`${styles['text_206']}`}>0个设备</span>
              <img
                className={`${styles['label_96']}`}
                src={
                  require('./assets/img/SketchPngc968af0a354f6cb49fb403cf417c97f9b94808a717a2580e463d9ef1b7c7df5a.png')
                }
              />
              <img
                className={`${styles['thumbnail_65']}`}
                src={
                  require('./assets/img/SketchPng13d7fbd45852123dbbb2259c36b2b2d58e9b9acce4134294dd3f871600d01e66.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_46']} flex-col`}>
              <span className={`${styles['text_207']}`}>添加房间</span>
            </div>
            <img
              className={`${styles['image_70']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
            <div className={`${styles['group_118']} flex-col`} />
          </div>
          <span className={`${styles['text_208']}`}>主卧</span>
        </div>
        <div className={`${styles['text-wrapper_47']} flex-row`}>
          <span className={`${styles['text_209']}`}>编辑设备卡片</span>
          <span className={`${styles['text_210']}`}>完成</span>
          <span className={`${styles['text_211']}`}>菜单展开</span>
          <span className={`${styles['text_212']}`}>房间管理</span>
          <span className={`${styles['text_213']}`}>编辑房间名称</span>
          <span className={`${styles['text_214']}`}>编辑房间</span>
          <span className={`${styles['text_215']}`}>删除成功</span>
          <span className={`${styles['text_216']}`}>完成编辑</span>
          <span className={`${styles['text_217']}`}>添加房间（反显顶部已选数量）</span>
          <span className={`${styles['text_218']}`}>添加成功（3s）</span>
        </div>
        <div className={`${styles['text-wrapper_48']} flex-row`}>
          <span className={`${styles['text_219']}`}>首次进入首页</span>
          <span className={`${styles['text_220']}`}>进入首页</span>
          <span className={`${styles['paragraph_1']}`}>
            1、拖动卡片改变排序
            <br />
            2、点选卡片多选可删除
          </span>
          <span className={`${styles['text_221']}`}>保存编辑结果</span>
          <span className={`${styles['paragraph_2']}`}>
            默认值有全屋、客厅、主卧；
            <br />
            排序全屋在第一个不可编辑；（全屋则是所有）
          </span>
          <span className={`${styles['paragraph_3']}`}>
            1、可编辑房间名称
            <br />
            2、可添展开收起房间设备（默认展开有设备的房间）
            <br />
            3、可添加房间
            <br />
            4、可编辑
          </span>
          <span className={`${styles['text_222']}`}>1、房间名称不能超过&nbsp;20&nbsp;个字符；</span>
          <span className={`${styles['paragraph_4']}`}>
            1、默认展开所有设备；
            <br />
            2、可按右侧图标上下拖拽房间组或
            <br />
            单个设备上下调整排序；
            <br />
            3、可点击左侧删除图标，左划卡片再点击删除房；
          </span>
          <span className={`${styles['paragraph_5']}`}>
            删除后出现tose“删除成功”提醒（3s）
            <br />
            该删除的房间从列表消失，
            <br />
            下面的卡片往上对齐
          </span>
          <span className={`${styles['text_223']}`}>保存以调整排序以及删除的房间列表</span>
          <span className={`${styles['paragraph_6']}`}>
            1、可通过输入名称添加
            <br />
            2、可点击推荐房间勾选添加（多选）
          </span>
          <span className={`${styles['text_224']}`}>新增房间反显在列表后面</span>
        </div>
        <div className={`${styles['group_119']} flex-row`}>
          <div className={`${styles['section_40']} flex-col justify-between`}>
            <div className={`${styles['box_61']} flex-col`}>
              <div className={`${styles['section_41']} flex-row`}>
                <span className={`${styles['text_225']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_66']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_67']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_71']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['section_42']} flex-row`}>
                <div className={`${styles['group_120']} flex-col`}>
                  <div className={`${styles['image-wrapper_55']} flex-col`}>
                    <img
                      className={`${styles['label_97']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_226']}`}>示例</span>
                <img
                  className={`${styles['image_72']}`}
                  src={
                    require('./assets/img/SketchPngcd6f59ae29fec2fdd30c190898b5fc1b5cc5fd6d4643772ff66d2f63f7063883.png')
                  }
                />
              </div>
              <div className={`${styles['section_43']} flex-col`}>
                <div className={`${styles['group_121']} flex-row`}>
                  <span className={`${styles['text_227']}`}>全屋</span>
                  <span className={`${styles['text_228']}`}>客厅</span>
                  <span className={`${styles['text_229']}`}>主卧</span>
                  <span className={`${styles['text_230']}`}>次卧</span>
                  <span className={`${styles['text_231']}`}>厨房</span>
                  <img
                    className={`${styles['label_98']}`}
                    src={
                      require('./assets/img/SketchPng74216ec7c9b1b1772e35bf97c8404f45ccc65ab1637b347ebc7480476cb9066a.png')
                    }
                  />
                </div>
                <div className={`${styles['group_122']} flex-row`}>
                  <div className={`${styles['block_29']} flex-col`} />
                </div>
              </div>
              <img
                className={`${styles['image_73']}`}
                src={
                  require('./assets/img/SketchPngcc2b96c6a71a1647f67f4fad2cb30c159fc0d780bf3cadd1619d66dc3d8477d0.png')
                }
              />
              <span className={`${styles['text_232']}`}>暂无设备，请添加</span>
              <img
                className={`${styles['image_74']}`}
                src={
                  require('./assets/img/SketchPng155e0d79b6df8a38dfba8c3633980afa1946cb8f8eb71417818fba085bf2ca52.png')
                }
              />
            </div>
            <span className={`${styles['text_233']}`}>设备为空，缺省图提示</span>
          </div>
          <div className={`${styles['section_44']} flex-col`}>
            <div className={`${styles['box_62']} flex-col`}>
              <div className={`${styles['block_30']} flex-row`}>
                <span className={`${styles['text_234']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_68']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_69']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_75']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['block_31']} flex-row`}>
                <div className={`${styles['box_63']} flex-col`}>
                  <div className={`${styles['image-wrapper_56']} flex-col`}>
                    <img
                      className={`${styles['label_99']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_235']}`}>示例</span>
                <img
                  className={`${styles['image_76']}`}
                  src={
                    require('./assets/img/SketchPngcd6f59ae29fec2fdd30c190898b5fc1b5cc5fd6d4643772ff66d2f63f7063883.png')
                  }
                />
              </div>
              <div className={`${styles['block_32']} flex-col`}>
                <div className={`${styles['box_64']} flex-row`}>
                  <span className={`${styles['text_236']}`}>全屋</span>
                  <span className={`${styles['text_237']}`}>客厅</span>
                  <span className={`${styles['text_238']}`}>主卧</span>
                  <span className={`${styles['text_239']}`}>次卧</span>
                  <span className={`${styles['text_240']}`}>厨房</span>
                  <img
                    className={`${styles['label_100']}`}
                    src={
                      require('./assets/img/SketchPng74216ec7c9b1b1772e35bf97c8404f45ccc65ab1637b347ebc7480476cb9066a.png')
                    }
                  />
                </div>
                <div className={`${styles['box_65']} flex-row`}>
                  <div className={`${styles['box_66']} flex-col`} />
                </div>
              </div>
              <div className={`${styles['block_33']} flex-row justify-between`}>
                <div className={`${styles['group_123']} flex-col`}>
                  <div className={`${styles['box_67']} flex-col`}>
                    <div className={`${styles['block_34']} flex-row justify-between`}>
                      <div className={`${styles['group_124']} flex-col`} />
                      <div className={`${styles['group_125']} flex-col`}>
                        <div className={`${styles['image-wrapper_57']} flex-col`}>
                          <img
                            className={`${styles['image_77']}`}
                            src={
                              require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                            }
                          />
                        </div>
                        <img
                          className={`${styles['image_78']}`}
                          src={
                            require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_49']} flex-row`}>
                      <span className={`${styles['text_241']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <div className={`${styles['text-wrapper_50']} flex-row`}>
                      <span className={`${styles['text_242']}`}>RW-400PRO</span>
                    </div>
                    <div className={`${styles['image-wrapper_58']} flex-row`}>
                      <img
                        className={`${styles['label_101']}`}
                        src={
                          require('./assets/img/SketchPng79f04ba3330c78658776474e35e989ee0106a6c7db6d6729806bf7fc533fd0b2.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_126']} flex-col`}>
                  <div className={`${styles['box_68']} flex-col`}>
                    <div className={`${styles['box_69']} flex-row justify-between`}>
                      <div className={`${styles['box_70']} flex-col`} />
                      <div className={`${styles['box_71']} flex-col`}>
                        <div className={`${styles['block_35']} flex-col`}>
                          <div className={`${styles['box_72']} flex-col`}>
                            <div className={`${styles['box_73']} flex-col`} />
                            <img
                              className={`${styles['image_79']}`}
                              src={
                                require('./assets/img/SketchPngb81cf314c72f891e16f68e8b6ff9671e9c5bb4d9e6ddda9cb2b17c4dc7a3dd51.png')
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_51']} flex-row`}>
                      <span className={`${styles['text_243']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <div className={`${styles['text-wrapper_52']} flex-row`}>
                      <span className={`${styles['text_244']}`}>RW-400PRO</span>
                    </div>
                    <div className={`${styles['image-wrapper_59']} flex-row`}>
                      <img
                        className={`${styles['label_102']}`}
                        src={
                          require('./assets/img/SketchPngca71eb7c7924364739af1d22449c33e80260e4c6b0b549d72f81a167aea1684c.png')
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['block_36']} flex-row justify-between`}>
                <div className={`${styles['section_45']} flex-col`}>
                  <div className={`${styles['section_46']} flex-col`}>
                    <div className={`${styles['block_37']} flex-row justify-between`}>
                      <div className={`${styles['group_127']} flex-col`} />
                      <div className={`${styles['group_128']} flex-col`}>
                        <div className={`${styles['box_74']} flex-col`}>
                          <div className={`${styles['group_129']} flex-col`}>
                            <div className={`${styles['group_130']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_80']}`}
                            src={
                              require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_53']} flex-row`}>
                      <span className={`${styles['text_245']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <div className={`${styles['text-wrapper_54']} flex-row`}>
                      <span className={`${styles['text_246']}`}>RW-400PRO</span>
                    </div>
                    <div className={`${styles['image-wrapper_60']} flex-row`}>
                      <img
                        className={`${styles['label_103']}`}
                        src={
                          require('./assets/img/SketchPng79f04ba3330c78658776474e35e989ee0106a6c7db6d6729806bf7fc533fd0b2.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_47']} flex-col`}>
                  <div className={`${styles['group_131']} flex-col`}>
                    <div className={`${styles['box_75']} flex-row justify-between`}>
                      <div className={`${styles['box_76']} flex-col`} />
                      <div className={`${styles['box_77']} flex-col`}>
                        <div className={`${styles['group_132']} flex-col`}>
                          <div className={`${styles['box_78']} flex-col`}>
                            <div className={`${styles['group_133']} flex-col`} />
                            <img
                              className={`${styles['image_81']}`}
                              src={
                                require('./assets/img/SketchPng59562b7060e55504ec82150e457985187daf3590a7b780830a11ed869d912d28.png')
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_55']} flex-row`}>
                      <span className={`${styles['text_247']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <div className={`${styles['text-wrapper_56']} flex-row`}>
                      <span className={`${styles['text_248']}`}>RW-400PRO</span>
                    </div>
                    <div className={`${styles['image-wrapper_61']} flex-row`}>
                      <img
                        className={`${styles['label_104']}`}
                        src={
                          require('./assets/img/SketchPng053ebb59259546d6db7059f5769837baa72e1ee5bc39db3d48e8431b7917ede7.png')
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles['block_38']} flex-row justify-between`}>
                <div className={`${styles['box_79']} flex-col`}>
                  <div className={`${styles['group_134']} flex-col`}>
                    <div className={`${styles['block_39']} flex-row justify-between`}>
                      <div className={`${styles['box_80']} flex-col`} />
                      <div className={`${styles['box_81']} flex-col`}>
                        <div className={`${styles['image-wrapper_62']} flex-col`}>
                          <img
                            className={`${styles['image_82']}`}
                            src={
                              require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                            }
                          />
                        </div>
                        <img
                          className={`${styles['image_83']}`}
                          src={
                            require('./assets/img/SketchPng1f2eb3b77f4b7a62b70398fa4c4382a97f25a7d555b1d72e9a0a8f959a0defbf.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_57']} flex-row`}>
                      <span className={`${styles['text_249']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <div className={`${styles['text-wrapper_58']} flex-row`}>
                      <span className={`${styles['text_250']}`}>RW-400PRO</span>
                    </div>
                    <div className={`${styles['image-wrapper_63']} flex-row`}>
                      <img
                        className={`${styles['label_105']}`}
                        src={
                          require('./assets/img/SketchPng0f728c92f8db016e82522b35d135b8a7766de556f595c46cbf2538d25afc8690.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_82']} flex-col`}>
                  <div className={`${styles['section_48']} flex-col`}>
                    <div className={`${styles['box_83']} flex-row justify-between`}>
                      <div className={`${styles['group_135']} flex-col`} />
                      <div className={`${styles['group_136']} flex-col`}>
                        <div className={`${styles['block_40']} flex-col`}>
                          <div className={`${styles['box_84']} flex-col`}>
                            <div className={`${styles['box_85']} flex-col`} />
                            <img
                              className={`${styles['image_84']}`}
                              src={
                                require('./assets/img/SketchPngcea700e71d22280a10a5ef74c69717b08c5b88ae37c21dd3228adde3e03a88ce.png')
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_59']} flex-row`}>
                      <span className={`${styles['text_251']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <div className={`${styles['text-wrapper_60']} flex-row`}>
                      <span className={`${styles['text_252']}`}>RW-400PRO</span>
                    </div>
                    <div className={`${styles['image-wrapper_64']} flex-row`}>
                      <img
                        className={`${styles['label_106']}`}
                        src={
                          require('./assets/img/SketchPngff26cf54829bc496ba1cedb4491b6c114d7c1fbcedb655f346e37c07025223d2.png')
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <span className={`${styles['text_253']}`}>两分化设备卡片瀑布流</span>
            <span className={`${styles['paragraph_7']}`}>
              保持顶部与底部导航栏再最高层级，
              <br />
              滑动保持位置不变
            </span>
          </div>
          <div className={`${styles['section_49']} flex-col`}>
            <div className={`${styles['group_137']} flex-col`}>
              <div className={`${styles['box_86']} flex-row`}>
                <span className={`${styles['text_254']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_70']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_71']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_85']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_87']} flex-row`}>
                <div className={`${styles['box_88']} flex-col`}>
                  <div className={`${styles['image-wrapper_65']} flex-col`}>
                    <img
                      className={`${styles['label_107']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_255']}`}>示例</span>
                <img
                  className={`${styles['image_86']}`}
                  src={
                    require('./assets/img/SketchPngcd6f59ae29fec2fdd30c190898b5fc1b5cc5fd6d4643772ff66d2f63f7063883.png')
                  }
                />
              </div>
              <div className={`${styles['box_89']} flex-col`}>
                <div className={`${styles['section_50']} flex-row`}>
                  <span className={`${styles['text_256']}`}>全屋</span>
                  <span className={`${styles['text_257']}`}>客厅</span>
                  <span className={`${styles['text_258']}`}>主卧</span>
                  <span className={`${styles['text_259']}`}>次卧</span>
                  <span className={`${styles['text_260']}`}>厨房</span>
                  <img
                    className={`${styles['label_108']}`}
                    src={
                      require('./assets/img/SketchPng74216ec7c9b1b1772e35bf97c8404f45ccc65ab1637b347ebc7480476cb9066a.png')
                    }
                  />
                </div>
                <div className={`${styles['section_51']} flex-row`}>
                  <div className={`${styles['group_138']} flex-col`} />
                </div>
              </div>
              <div className={`${styles['box_90']} flex-row justify-between`}>
                <div className={`${styles['box_91']} flex-col`}>
                  <div className={`${styles['section_52']} flex-row justify-between`}>
                    <div className={`${styles['group_139']} flex-col`} />
                    <div className={`${styles['group_140']} flex-col`}>
                      <div className={`${styles['image-wrapper_66']} flex-col`}>
                        <img
                          className={`${styles['image_87']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_88']}`}
                        src={
                          require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_61']} flex-row`}>
                    <span className={`${styles['text_261']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_62']} flex-row`}>
                    <span className={`${styles['text_262']}`}>Powered&nbsp;Off</span>
                  </div>
                  <div className={`${styles['image-wrapper_67']} flex-row`}>
                    <img
                      className={`${styles['label_109']}`}
                      src={
                        require('./assets/img/SketchPng61ee2a43ac22a961e249dc87a5d0da485f9ec13fc44fe2ca5ca657aee6bf5119.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['box_92']} flex-col`}>
                  <div className={`${styles['box_93']} flex-row justify-between`}>
                    <div className={`${styles['group_141']} flex-col`} />
                    <div className={`${styles['group_142']} flex-col`}>
                      <div className={`${styles['group_143']} flex-col`}>
                        <div className={`${styles['section_53']} flex-col`}>
                          <div className={`${styles['group_144']} flex-col`} />
                          <img
                            className={`${styles['image_89']}`}
                            src={
                              require('./assets/img/SketchPngb81cf314c72f891e16f68e8b6ff9671e9c5bb4d9e6ddda9cb2b17c4dc7a3dd51.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_63']} flex-row`}>
                    <span className={`${styles['text_263']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_64']} flex-row`}>
                    <span className={`${styles['text_264']}`}>Powered&nbsp;Off</span>
                  </div>
                  <div className={`${styles['image-wrapper_68']} flex-row`}>
                    <img
                      className={`${styles['label_110']}`}
                      src={
                        require('./assets/img/SketchPng61ee2a43ac22a961e249dc87a5d0da485f9ec13fc44fe2ca5ca657aee6bf5119.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles['box_94']} flex-row justify-between`}>
                <div className={`${styles['group_145']} flex-col`}>
                  <div className={`${styles['section_54']} flex-row justify-between`}>
                    <div className={`${styles['group_146']} flex-col`} />
                    <div className={`${styles['group_147']} flex-col`}>
                      <div className={`${styles['section_55']} flex-col`}>
                        <div className={`${styles['box_95']} flex-col`}>
                          <div className={`${styles['section_56']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_90']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_65']} flex-row`}>
                    <span className={`${styles['text_265']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_66']} flex-row`}>
                    <span className={`${styles['text_266']}`}>Powered&nbsp;Off</span>
                  </div>
                  <div className={`${styles['image-wrapper_69']} flex-row`}>
                    <img
                      className={`${styles['label_111']}`}
                      src={
                        require('./assets/img/SketchPngb42c594620a5e669c064c9568cb9b0818e46b6772b827c487b89ad0db6620373.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['group_148']} flex-col`}>
                  <div className={`${styles['group_149']} flex-row justify-between`}>
                    <div className={`${styles['block_41']} flex-col`} />
                    <div className={`${styles['block_42']} flex-col`}>
                      <div className={`${styles['group_150']} flex-col`}>
                        <div className={`${styles['group_151']} flex-col`}>
                          <div className={`${styles['group_152']} flex-col`} />
                          <div className={`${styles['group_153']} flex-col`} />
                          <img
                            className={`${styles['image_91']}`}
                            src={
                              require('./assets/img/SketchPngbd2afc4f9456e85dfb71ba976f2a2a8dd46b4c12174acff176e6241a02e1e29c.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_67']} flex-row`}>
                    <span className={`${styles['text_267']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_68']} flex-row`}>
                    <span className={`${styles['text_268']}`}>Cooling</span>
                  </div>
                  <div className={`${styles['image-wrapper_70']} flex-row`}>
                    <img
                      className={`${styles['label_112']}`}
                      src={
                        require('./assets/img/SketchPng409bbdb691f8df69d0feca043e1f1a223f027d5f91f0b9500fa27103b283688b.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles['box_96']} flex-row justify-between`}>
                <div className={`${styles['block_43']} flex-col`}>
                  <div className={`${styles['box_97']} flex-row justify-between`}>
                    <div className={`${styles['group_154']} flex-col`} />
                    <div className={`${styles['group_155']} flex-col`}>
                      <div className={`${styles['image-wrapper_71']} flex-col`}>
                        <img
                          className={`${styles['image_92']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_93']}`}
                        src={
                          require('./assets/img/SketchPng699c2b04a27d0f630c3c0c9e6ef65cee1b2358000cb40c2b9d787c6f09d147fb.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_69']} flex-row`}>
                    <span className={`${styles['text_269']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_70']} flex-row`}>
                    <span className={`${styles['text_270']}`}>Offline</span>
                  </div>
                  <div className={`${styles['image-wrapper_72']} flex-row`}>
                    <img
                      className={`${styles['label_113']}`}
                      src={
                        require('./assets/img/SketchPng0f728c92f8db016e82522b35d135b8a7766de556f595c46cbf2538d25afc8690.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['block_44']} flex-col`}>
                  <div className={`${styles['group_156']} flex-row justify-between`}>
                    <div className={`${styles['group_157']} flex-col`} />
                    <div className={`${styles['group_158']} flex-col`}>
                      <div className={`${styles['section_57']} flex-col`}>
                        <div className={`${styles['image-wrapper_73']} flex-col`}>
                          <img
                            className={`${styles['image_94']}`}
                            src={
                              require('./assets/img/SketchPngb81cf314c72f891e16f68e8b6ff9671e9c5bb4d9e6ddda9cb2b17c4dc7a3dd51.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_71']} flex-row`}>
                    <span className={`${styles['text_271']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_72']} flex-row`}>
                    <span className={`${styles['text_272']}`}>Powered&nbsp;Off</span>
                  </div>
                  <div className={`${styles['image-wrapper_74']} flex-row`}>
                    <img
                      className={`${styles['label_114']}`}
                      src={
                        require('./assets/img/SketchPnge33ac230bb34f069d3473293a09096bdc8f517561af8cda40d89abc00cdd5c7c.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles['box_98']} flex-col justify-end`}>
                <div className={`${styles['box_99']} flex-col justify-around`}>
                  <span className={`${styles['text_273']}`}>添加设备</span>
                  <span className={`${styles['text_274']}`}>扫一扫</span>
                  <img
                    className={`${styles['image_95']}`}
                    src={
                      require('./assets/img/SketchPngeac42879b7274d992d8626fcb56c0c45afd0c681f32e6bff2f73f3159cf24d90.png')
                    }
                  />
                  <img
                    className={`${styles['image_96']}`}
                    src={
                      require('./assets/img/SketchPngcc2afaf3b3e79147d3e8a798e419d090a08184800f3844e85fafca05d2625c16.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_97']}`}
                  src={
                    require('./assets/img/SketchPngb90ec7447e33c904e4e8308183df6107145180bc56baf90c571cafe850d2060a.png')
                  }
                />
              </div>
            </div>
            <span className={`${styles['text_275']}`}>+添加设备</span>
            <span className={`${styles['paragraph_8']}`}>
              1、添加设备
              <br />
              2、扫一扫
            </span>
          </div>
          <div className={`${styles['section_58']} flex-col`}>
            <div className={`${styles['group_159']} flex-col`}>
              <div className={`${styles['box_100']} flex-row`}>
                <span className={`${styles['text_276']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_72']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_73']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_98']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_101']} flex-row`}>
                <div className={`${styles['section_59']} flex-col`}>
                  <div className={`${styles['image-wrapper_75']} flex-col`}>
                    <img
                      className={`${styles['label_115']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_277']}`}>添加设备</span>
              </div>
              <span className={`${styles['text_278']}`}>正在扫描附近蓝牙设备</span>
              <span className={`${styles['text_279']}`}>请保持设备已接通电源，并在附近</span>
              <img
                className={`${styles['image_99']}`}
                src={
                  require('./assets/img/SketchPng84b40d859cb1e4a0305c1c57816ab45657cb75501f68e7f84d24a0a5e7a2db34.png')
                }
              />
              <div className={`${styles['box_102']} flex-col justify-end`}>
                <div className={`${styles['text-wrapper_73']} flex-col`}>
                  <span className={`${styles['text_280']}`}>权限与服务</span>
                </div>
                <div className={`${styles['box_103']} flex-col`}>
                  <span className={`${styles['text_281']}`}>权限</span>
                  <div className={`${styles['block_45']} flex-row`}>
                    <span className={`${styles['text_282']}`}>位置权限</span>
                    <img
                      className={`${styles['label_116']}`}
                      src={
                        require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                      }
                    />
                  </div>
                  <div className={`${styles['block_46']} flex-row justify-between`}>
                    <span className={`${styles['text_283']}`}>蓝牙权限</span>
                    <img
                      className={`${styles['label_117']}`}
                      src={
                        require('./assets/img/SketchPngff84ee6a8247152c5cfdaad0203f9b54c19bbf07736e0f2090318489786210ae.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text_284']}`}>需要权限以访问Wi-Fi和蓝牙以发现设备</span>
                  <span className={`${styles['text_285']}`}>服务</span>
                  <div className={`${styles['block_47']} flex-row`}>
                    <span className={`${styles['text_286']}`}>位置权限</span>
                    <img
                      className={`${styles['label_118']}`}
                      src={
                        require('./assets/img/SketchPng664edf4cc1b104e0eff709ffe0cc978c819998b1d1dab151c954019c637de634.png')
                      }
                    />
                  </div>
                  <div className={`${styles['block_48']} flex-row justify-between`}>
                    <span className={`${styles['text_287']}`}>蓝牙权限</span>
                    <img
                      className={`${styles['label_119']}`}
                      src={
                        require('./assets/img/SketchPngff84ee6a8247152c5cfdaad0203f9b54c19bbf07736e0f2090318489786210ae.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text_288']}`}>启用蓝牙和位置服务以扫描和链接附近的设备</span>
                </div>
                <div className={`${styles['box_104']} flex-row`}>
                  <div className={`${styles['text-wrapper_74']} flex-col`}>
                    <span className={`${styles['text_289']}`}>取消</span>
                  </div>
                  <div className={`${styles['block_49']} flex-col`}>
                    <span className={`${styles['text_290']}`}>确定</span>
                    <img
                      className={`${styles['image_100']}`}
                      src={
                        require('./assets/img/SketchPng6005e9d3f01eae5fa47c83c562908788bd41da6baed2f620c6eec16e2522639a.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <span className={`${styles['text_291']}`}>权限与服务</span>
            <span className={`${styles['text_292']}`}>识别是否打开位置与蓝牙；没有则需要手动授权</span>
          </div>
          <div className={`${styles['section_60']} flex-col`}>
            <div className={`${styles['box_105']} flex-row`}>
              <div className={`${styles['box_106']} flex-col`}>
                <div className={`${styles['section_61']} flex-row`}>
                  <span className={`${styles['text_293']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_74']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_75']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_101']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['section_62']} flex-row`}>
                  <div className={`${styles['box_107']} flex-col`}>
                    <div className={`${styles['image-wrapper_76']} flex-col`}>
                      <img
                        className={`${styles['label_120']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_294']}`}>添加设备</span>
                </div>
                <span className={`${styles['text_295']}`}>正在扫描附近蓝牙设备</span>
                <span className={`${styles['text_296']}`}>请保持设备已接通电源，并在附近</span>
                <img
                  className={`${styles['image_102']}`}
                  src={
                    require('./assets/img/SketchPng84b40d859cb1e4a0305c1c57816ab45657cb75501f68e7f84d24a0a5e7a2db34.png')
                  }
                />
                <span className={`${styles['text_297']}`}>搜不到设备？手动添加</span>
                <span className={`${styles['text_298']}`}>风扇：</span>
                <div className={`${styles['section_63']} flex-row justify-between`}>
                  <div className={`${styles['group_160']} flex-col`}>
                    <div className={`${styles['section_64']} flex-col`}>
                      <div className={`${styles['image-wrapper_77']} flex-col`}>
                        <img
                          className={`${styles['label_121']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_299']}`}>AS1100</span>
                    <span className={`${styles['text_300']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_78']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_76']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_77']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['group_161']} flex-col`}>
                    <div className={`${styles['block_50']} flex-col`}>
                      <div className={`${styles['box_108']} flex-col`}>
                        <div className={`${styles['block_51']} flex-col`}>
                          <div className={`${styles['box_109']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_122']}`}
                          src={
                            require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_301']}`}>AS1101</span>
                    <span className={`${styles['text_302']}`}>AStar</span>
                    <img
                      className={`${styles['thumbnail_78']}`}
                      src={
                        require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_162']} flex-col`}>
                    <div className={`${styles['block_52']} flex-col`}>
                      <div className={`${styles['image-wrapper_79']} flex-col`}>
                        <img
                          className={`${styles['label_123']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_303']}`}>AS1102</span>
                    <span className={`${styles['text_304']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_80']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_79']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_80']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_65']} flex-col`}>
                  <div className={`${styles['group_163']} flex-col`}>
                    <div className={`${styles['box_110']} flex-col`}>
                      <div className={`${styles['box_111']} flex-col`}>
                        <div className={`${styles['box_112']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['label_124']}`}
                        src={
                          require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_305']}`}>AS1103</span>
                  <span className={`${styles['text_306']}`}>AStar</span>
                  <img
                    className={`${styles['thumbnail_81']}`}
                    src={
                      require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_103']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_113']} flex-col`}>
                <div className={`${styles['group_164']} flex-row`}>
                  <span className={`${styles['text_307']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_82']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_83']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_104']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['group_165']} flex-row`}>
                  <div className={`${styles['block_53']} flex-col`}>
                    <div className={`${styles['image-wrapper_81']} flex-col`}>
                      <img
                        className={`${styles['label_125']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_308']}`}>添加设备</span>
                </div>
                <div className={`${styles['group_166']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_126']}`}
                    src={
                      require('./assets/img/SketchPng2bcf4a3a3d4411ed5c68f307912287d1e48bd0db1d939fcc4090b06ef2a86ff3.png')
                    }
                  />
                  <div className={`${styles['text-wrapper_75']} flex-col justify-between`}>
                    <span className={`${styles['text_309']}`}>正在扫描附近蓝牙设备</span>
                    <span className={`${styles['text_310']}`}>请保持设备已接通电源，并在附近</span>
                  </div>
                </div>
                <span className={`${styles['text_311']}`}>搜不到设备？手动添加</span>
                <span className={`${styles['text_312']}`}>风扇：</span>
                <div className={`${styles['group_167']} flex-row justify-between`}>
                  <div className={`${styles['group_168']} flex-col`}>
                    <div className={`${styles['group_169']} flex-col`}>
                      <div className={`${styles['image-wrapper_82']} flex-col`}>
                        <img
                          className={`${styles['label_127']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_313']}`}>AS1100</span>
                    <span className={`${styles['text_314']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_83']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_84']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_85']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['group_170']} flex-col`}>
                    <div className={`${styles['group_171']} flex-col`}>
                      <div className={`${styles['box_114']} flex-col`}>
                        <div className={`${styles['section_66']} flex-col`}>
                          <div className={`${styles['box_115']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_128']}`}
                          src={
                            require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_315']}`}>AS1101</span>
                    <span className={`${styles['text_316']}`}>AStar</span>
                    <img
                      className={`${styles['thumbnail_86']}`}
                      src={
                        require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_172']} flex-col`}>
                    <div className={`${styles['group_173']} flex-col`}>
                      <div className={`${styles['image-wrapper_84']} flex-col`}>
                        <img
                          className={`${styles['label_129']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_317']}`}>AS1102</span>
                    <span className={`${styles['text_318']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_85']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_87']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_88']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_174']} flex-col`}>
                  <div className={`${styles['group_175']} flex-col`}>
                    <div className={`${styles['group_176']} flex-col`}>
                      <div className={`${styles['group_177']} flex-col`}>
                        <div className={`${styles['group_178']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['label_130']}`}
                        src={
                          require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_319']}`}>AS1103</span>
                  <span className={`${styles['text_320']}`}>AStar</span>
                  <img
                    className={`${styles['thumbnail_89']}`}
                    src={
                      require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                    }
                  />
                </div>
                <span className={`${styles['text_321']}`}>酒柜：</span>
                <div className={`${styles['group_179']} flex-row justify-between`}>
                  <div className={`${styles['group_180']} flex-col`}>
                    <div className={`${styles['group_181']} flex-col`}>
                      <div className={`${styles['image-wrapper_86']} flex-col`}>
                        <img
                          className={`${styles['label_131']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_322']}`}>AS1100</span>
                    <span className={`${styles['text_323']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_87']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_90']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_91']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['group_182']} flex-col`}>
                    <div className={`${styles['section_67']} flex-col`}>
                      <div className={`${styles['section_68']} flex-col`}>
                        <div className={`${styles['group_183']} flex-col`}>
                          <div className={`${styles['box_116']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_132']}`}
                          src={
                            require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_324']}`}>AS1101</span>
                    <span className={`${styles['text_325']}`}>AStar</span>
                    <img
                      className={`${styles['thumbnail_92']}`}
                      src={
                        require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                      }
                    />
                  </div>
                </div>
                <img
                  className={`${styles['image_105']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_117']} flex-col`}>
                <div className={`${styles['box_118']} flex-row`}>
                  <span className={`${styles['text_326']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_93']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_94']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_106']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['box_119']} flex-row`}>
                  <div className={`${styles['box_120']} flex-col`}>
                    <div className={`${styles['image-wrapper_88']} flex-col`}>
                      <img
                        className={`${styles['label_133']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_327']}`}>添加设备</span>
                </div>
                <div className={`${styles['box_121']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_134']}`}
                    src={
                      require('./assets/img/SketchPng2bcf4a3a3d4411ed5c68f307912287d1e48bd0db1d939fcc4090b06ef2a86ff3.png')
                    }
                  />
                  <div className={`${styles['group_184']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_76']}`}>
                      <span className={`${styles['text_328']}`}>发现设备</span>
                      <span className={`${styles['text_329']}`}>2</span>
                    </div>
                    <span className={`${styles['text_330']}`}>请保持设备已接通电源，并在附近</span>
                  </div>
                </div>
                <div className={`${styles['box_122']} flex-row`}>
                  <div className={`${styles['box_123']} flex-col`}>
                    <div className={`${styles['group_185']} flex-col`}>
                      <div className={`${styles['block_54']} flex-col`}>
                        <div className={`${styles['box_124']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['image_107']}`}
                        src={
                          require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_77']} flex-col`}>
                    <span className={`${styles['text_331']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_332']}`}>RW-400PRO</span>
                    <span className={`${styles['text_333']}`}>SN.:&nbsp;R26073100012607310001</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_95']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_125']} flex-row`}>
                  <div className={`${styles['section_69']} flex-col`}>
                    <div className={`${styles['image-wrapper_89']} flex-col`}>
                      <img
                        className={`${styles['image_108']}`}
                        src={
                          require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                        }
                      />
                    </div>
                    <img
                      className={`${styles['image_109']}`}
                      src={
                        require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-wrapper_78']} flex-col`}>
                    <span className={`${styles['text_334']}`}>Air&nbsp;Conditioner</span>
                    <span className={`${styles['text_335']}`}>RW-400PRO</span>
                    <span className={`${styles['text_336']}`}>MAC.:&nbsp;R26073100012607310001</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_96']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <span className={`${styles['text_337']}`}>搜不到设备？手动添加</span>
                <span className={`${styles['text_338']}`}>风扇：</span>
                <div className={`${styles['box_126']} flex-row justify-between`}>
                  <div className={`${styles['section_70']} flex-col`}>
                    <div className={`${styles['section_71']} flex-col`}>
                      <div className={`${styles['image-wrapper_90']} flex-col`}>
                        <img
                          className={`${styles['label_135']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_339']}`}>AS1100</span>
                    <span className={`${styles['text_340']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_91']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_97']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_98']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['section_72']} flex-col`}>
                    <div className={`${styles['block_55']} flex-col`}>
                      <div className={`${styles['group_186']} flex-col`}>
                        <div className={`${styles['group_187']} flex-col`}>
                          <div className={`${styles['block_56']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_136']}`}
                          src={
                            require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_341']}`}>AS1101</span>
                    <span className={`${styles['text_342']}`}>AStar</span>
                    <img
                      className={`${styles['thumbnail_99']}`}
                      src={
                        require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_73']} flex-col`}>
                    <div className={`${styles['group_188']} flex-col`}>
                      <div className={`${styles['image-wrapper_92']} flex-col`}>
                        <img
                          className={`${styles['label_137']}`}
                          src={
                            require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_343']}`}>AS1102</span>
                    <span className={`${styles['text_344']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_93']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_100']}`}
                        src={
                          require('./assets/img/SketchPngbbd25694189d3e75c1a626f9d4a34db84d498ecb14065423b6524ca911d8282a.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_101']}`}
                        src={
                          require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['box_127']} flex-col`}>
                  <div className={`${styles['group_189']} flex-col`}>
                    <div className={`${styles['box_128']} flex-col`}>
                      <div className={`${styles['box_129']} flex-col`}>
                        <div className={`${styles['section_74']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['label_138']}`}
                        src={
                          require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_345']}`}>AS1103</span>
                  <span className={`${styles['text_346']}`}>AStar</span>
                  <img
                    className={`${styles['thumbnail_102']}`}
                    src={
                      require('./assets/img/SketchPng6ba307ae1e7c7acd109faf88abc63ce35e8d404b79c861ae2902da4d527d0b27.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_110']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
                <img
                  className={`${styles['image_111']}`}
                  src={
                    require('./assets/img/SketchPng271afd732bc2830b08ed3bedc9f65de9c3bf2c77133785e42c658aed9d5d9e10.png')
                  }
                />
              </div>
              <div className={`${styles['box_130']} flex-col`}>
                <span className={`${styles['text_347']}`}>扫描失败</span>
                <img
                  className={`${styles['image_112']}`}
                  src={
                    require('./assets/img/SketchPngb2ce297dfdae8b3c22309c0c872a324bc4193d7063fd45ed6f9fd70db6e4bd26.png')
                  }
                />
                <span className={`${styles['text_348']}`}>成功</span>
              </div>
              <div className={`${styles['box_131']} flex-col`}>
                <div className={`${styles['group_190']} flex-row`}>
                  <span className={`${styles['text_349']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_103']}`}
                    src={
                      require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_104']}`}
                    src={
                      require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                    }
                  />
                  <img
                    className={`${styles['image_113']}`}
                    src={
                      require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                    }
                  />
                </div>
                <div className={`${styles['group_191']} flex-row`}>
                  <div className={`${styles['block_57']} flex-col`}>
                    <div className={`${styles['image-wrapper_94']} flex-col`}>
                      <img
                        className={`${styles['label_139']}`}
                        src={
                          require('./assets/img/SketchPng1e4d72e7fcfde16c4fe43b4377906e7d47c139aa988c7ed530d29d693478f836.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_350']}`}>添加设备</span>
                </div>
                <div className={`${styles['group_192']} flex-row`}>
                  <img
                    className={`${styles['label_140']}`}
                    src={
                      require('./assets/img/SketchPng188300693d06028ea80c5744a944ae2c03697206e78a28e97547366ca37e0875.png')
                    }
                  />
                  <span className={`${styles['text_351']}`}>未发现设备</span>
                  <div className={`${styles['text-wrapper_79']} flex-col`}>
                    <span className={`${styles['text_352']}`}>重新扫描</span>
                  </div>
                </div>
                <span className={`${styles['text_353']}`}>搜不到设备？手动添加</span>
                <span className={`${styles['text_354']}`}>风扇：</span>
                <div className={`${styles['group_193']} flex-row justify-between`}>
                  <div className={`${styles['group_194']} flex-col`}>
                    <div className={`${styles['box_132']} flex-col`}>
                      <div className={`${styles['image-wrapper_95']} flex-col`}>
                        <img
                          className={`${styles['label_141']}`}
                          src={
                            require('./assets/img/SketchPngfe51d20d81941bc71153a4f9515bd7e8f03c4e9c11bd48b7d28d672a729c6436.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_355']}`}>AS1100</span>
                    <span className={`${styles['text_356']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_96']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_105']}`}
                        src={
                          require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_106']}`}
                        src={
                          require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['group_195']} flex-col`}>
                    <div className={`${styles['group_196']} flex-col`}>
                      <div className={`${styles['section_75']} flex-col`}>
                        <div className={`${styles['block_58']} flex-col`}>
                          <div className={`${styles['box_133']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_142']}`}
                          src={
                            require('./assets/img/SketchPng1ddc6d4fca52b5e62049d984903f2271252670c649550f21549c47f1177ee438.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_357']}`}>AS1101</span>
                    <span className={`${styles['text_358']}`}>AStar</span>
                    <img
                      className={`${styles['thumbnail_107']}`}
                      src={
                        require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_197']} flex-col`}>
                    <div className={`${styles['block_59']} flex-col`}>
                      <div className={`${styles['image-wrapper_97']} flex-col`}>
                        <img
                          className={`${styles['label_143']}`}
                          src={
                            require('./assets/img/SketchPngfe51d20d81941bc71153a4f9515bd7e8f03c4e9c11bd48b7d28d672a729c6436.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_359']}`}>AS1102</span>
                    <span className={`${styles['text_360']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_98']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_108']}`}
                        src={
                          require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_109']}`}
                        src={
                          require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_198']} flex-col`}>
                  <div className={`${styles['block_60']} flex-col`}>
                    <div className={`${styles['section_76']} flex-col`}>
                      <div className={`${styles['box_134']} flex-col`}>
                        <div className={`${styles['block_61']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['label_144']}`}
                        src={
                          require('./assets/img/SketchPng1ddc6d4fca52b5e62049d984903f2271252670c649550f21549c47f1177ee438.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_361']}`}>AS1103</span>
                  <span className={`${styles['text_362']}`}>AStar</span>
                  <img
                    className={`${styles['thumbnail_110']}`}
                    src={
                      require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                    }
                  />
                </div>
                <span className={`${styles['text_363']}`}>酒柜：</span>
                <div className={`${styles['group_199']} flex-row justify-between`}>
                  <div className={`${styles['box_135']} flex-col`}>
                    <div className={`${styles['block_62']} flex-col`}>
                      <div className={`${styles['image-wrapper_99']} flex-col`}>
                        <img
                          className={`${styles['label_145']}`}
                          src={
                            require('./assets/img/SketchPngfe51d20d81941bc71153a4f9515bd7e8f03c4e9c11bd48b7d28d672a729c6436.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_364']}`}>AS1100</span>
                    <span className={`${styles['text_365']}`}>AStar</span>
                    <div className={`${styles['image-wrapper_100']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_111']}`}
                        src={
                          require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_112']}`}
                        src={
                          require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['box_136']} flex-col`}>
                    <div className={`${styles['box_137']} flex-col`}>
                      <div className={`${styles['section_77']} flex-col`}>
                        <div className={`${styles['box_138']} flex-col`}>
                          <div className={`${styles['group_200']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['label_146']}`}
                          src={
                            require('./assets/img/SketchPng1ddc6d4fca52b5e62049d984903f2271252670c649550f21549c47f1177ee438.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_366']}`}>AS1101</span>
                    <span className={`${styles['text_367']}`}>AStar</span>
                    <img
                      className={`${styles['thumbnail_113']}`}
                      src={
                        require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                      }
                    />
                  </div>
                </div>
                <img
                  className={`${styles['image_114']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['box_139']} flex-row`}>
              <div className={`${styles['text-wrapper_80']} flex-col justify-between`}>
                <span className={`${styles['text_368']}`}>扫描中（30s）</span>
                <span className={`${styles['paragraph_9']}`}>
                  1、扫描动画自转360度
                  <br />
                  2、按分类推荐设备列表
                </span>
              </div>
              <span className={`${styles['text_369']}`}>扫描中（上滑）</span>
              <div className={`${styles['text-group_1']} flex-col justify-between`}>
                <span className={`${styles['text_370']}`}>扫描中（上滑）</span>
                <span className={`${styles['text_371']}`}>已发现设备，设备列表往下叠加</span>
              </div>
              <div className={`${styles['text-wrapper_81']} flex-col justify-between`}>
                <span className={`${styles['text_372']}`}>扫描失败</span>
                <span className={`${styles['paragraph_10']}`}>
                  未发现设备，动画停止，
                  <br />
                  右侧按钮可点击重新扫描
                </span>
              </div>
            </div>
            <span className={`${styles['text_373']}`}>手动添加</span>
            <div className={`${styles['box_140']} flex-row`}>
              <div className={`${styles['group_201']} flex-col`}>
                <div className={`${styles['box_141']} flex-row`}>
                  <span className={`${styles['text_374']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_114']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_115']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_115']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['box_142']} flex-row`}>
                  <div className={`${styles['image-text_1']} flex-row justify-between`}>
                    <div className={`${styles['box_143']} flex-col`}>
                      <div className={`${styles['image-wrapper_101']} flex-col`}>
                        <img
                          className={`${styles['label_147']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_2']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_116']}`}
                  src={
                    require('./assets/img/SketchPngfc055759d5bc283e817a0cc1ebbc9b6136c666d5674405a25815edfdea0baff5.png')
                  }
                />
                <span className={`${styles['text_375']}`}>连接Wi-Fi网络</span>
                <span className={`${styles['paragraph_11']}`}>
                  *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                  <br />
                  请勿开启5GH频段。
                </span>
                <img
                  className={`${styles['image_117']}`}
                  src={
                    require('./assets/img/SketchPngb801f99351edeb0a9763668f6e412a56f630748c997d65ffb3faa3a3ec320ffa.png')
                  }
                />
                <div className={`${styles['box_144']} flex-row`}>
                  <div className={`${styles['image-text_2']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_148']}`}
                      src={
                        require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                      }
                    />
                    <span className={`${styles['text-group_3']}`}>ROWAN-office</span>
                  </div>
                </div>
                <div className={`${styles['box_145']} flex-row`}>
                  <div className={`${styles['image-text_3']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_149']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text-group_4']}`}>请输入Wi-Fi密码</span>
                  </div>
                  <img
                    className={`${styles['label_150']}`}
                    src={
                      require('./assets/img/SketchPng162c90f3ab0b519c590db2c74524d9fbb3fe34693848e9f9b87ee9f7486a56e3.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_82']} flex-col`}>
                  <span className={`${styles['text_376']}`}>FAQ</span>
                </div>
                <div className={`${styles['text-wrapper_83']} flex-col`}>
                  <span className={`${styles['text_377']}`}>下一步</span>
                </div>
                <img
                  className={`${styles['image_118']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['group_202']} flex-col`}>
                <div className={`${styles['block_63']} flex-row`}>
                  <span className={`${styles['text_378']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_116']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_117']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_119']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['block_64']} flex-row`}>
                  <div className={`${styles['image-text_4']} flex-row justify-between`}>
                    <div className={`${styles['block_65']} flex-col`}>
                      <div className={`${styles['image-wrapper_102']} flex-col`}>
                        <img
                          className={`${styles['label_151']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_5']}`}>添加设备</span>
                  </div>
                </div>
                <div className={`${styles['text-group_6']} flex-col justify-between`}>
                  <span className={`${styles['text_379']}`}>连接Wi-Fi网络</span>
                  <span className={`${styles['paragraph_12']}`}>
                    *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                    <br />
                    请勿开启5GH频段。
                  </span>
                </div>
                <div className={`${styles['block_66']} flex-row`}>
                  <div className={`${styles['image-text_5']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_152']}`}
                      src={
                        require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                      }
                    />
                    <span className={`${styles['text-group_7']}`}>ROWAN-office</span>
                  </div>
                </div>
                <div className={`${styles['block_67']} flex-row`}>
                  <div className={`${styles['image-text_6']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_153']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text-group_8']}`}>123456788</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_120']}`}
                  src={
                    require('./assets/img/SketchPngb801f99351edeb0a9763668f6e412a56f630748c997d65ffb3faa3a3ec320ffa.png')
                  }
                />
                <div className={`${styles['text-wrapper_84']} flex-col`}>
                  <span className={`${styles['text_380']}`}>FAQ</span>
                </div>
                <div className={`${styles['text-wrapper_85']} flex-col`}>
                  <span className={`${styles['text_381']}`}>下一步</span>
                </div>
                <img
                  className={`${styles['image_121']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
                <img
                  className={`${styles['image_122']}`}
                  src={
                    require('./assets/img/SketchPng4a3d75a8aab6589e08a078efc11e60c42f070d19b60f92184b4d0c8070c47653.png')
                  }
                />
              </div>
              <div className={`${styles['group_203']} flex-col`}>
                <div className={`${styles['group_204']} flex-row`}>
                  <span className={`${styles['text_382']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_118']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_119']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_123']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['group_205']} flex-row`}>
                  <div className={`${styles['image-text_7']} flex-row justify-between`}>
                    <div className={`${styles['box_146']} flex-col`}>
                      <div className={`${styles['image-wrapper_103']} flex-col`}>
                        <img
                          className={`${styles['label_154']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_9']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_124']}`}
                  src={
                    require('./assets/img/SketchPngfc055759d5bc283e817a0cc1ebbc9b6136c666d5674405a25815edfdea0baff5.png')
                  }
                />
                <span className={`${styles['text_383']}`}>连接Wi-Fi网络</span>
                <span className={`${styles['paragraph_13']}`}>
                  *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                  <br />
                  请勿开启5GH频段。
                </span>
                <img
                  className={`${styles['image_125']}`}
                  src={
                    require('./assets/img/SketchPngb801f99351edeb0a9763668f6e412a56f630748c997d65ffb3faa3a3ec320ffa.png')
                  }
                />
                <div className={`${styles['group_206']} flex-row`}>
                  <div className={`${styles['image-text_8']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_155']}`}
                      src={
                        require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                      }
                    />
                    <span className={`${styles['text-group_10']}`}>ROWAN-office</span>
                  </div>
                </div>
                <div className={`${styles['group_207']} flex-row`}>
                  <div className={`${styles['image-text_9']} flex-row justify-between`}>
                    <img
                      className={`${styles['label_156']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text-group_11']}`}>**********</span>
                  </div>
                  <img
                    className={`${styles['label_157']}`}
                    src={
                      require('./assets/img/SketchPng162c90f3ab0b519c590db2c74524d9fbb3fe34693848e9f9b87ee9f7486a56e3.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_86']} flex-col`}>
                  <span className={`${styles['text_384']}`}>FAQ</span>
                </div>
                <div className={`${styles['group_208']} flex-col`}>
                  <span className={`${styles['text_385']}`}>下一步</span>
                  <img
                    className={`${styles['image_126']}`}
                    src={
                      require('./assets/img/SketchPng749b89588b5d370295941d625fa470f9a54ae7aa8c39f8b2fe4c0a00b723f6f5.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_127']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['group_209']} flex-col`}>
                <div className={`${styles['box_147']} flex-row`}>
                  <span className={`${styles['text_386']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_120']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_121']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_128']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['box_148']} flex-row`}>
                  <div className={`${styles['image-text_10']} flex-row justify-between`}>
                    <div className={`${styles['section_78']} flex-col`}>
                      <div className={`${styles['image-wrapper_104']} flex-col`}>
                        <img
                          className={`${styles['label_158']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_12']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_129']}`}
                  src={
                    require('./assets/img/SketchPng24af1e795dfa380b868637fb43f5a2cd82107c6b90ef558e4b104f7966185526.png')
                  }
                />
                <div className={`${styles['text-group_13']} flex-col justify-between`}>
                  <span className={`${styles['text_387']}`}>正在扫描附近蓝牙设备</span>
                  <span className={`${styles['text_388']}`}>请保持设备已接通电源，并在附近</span>
                </div>
                <img
                  className={`${styles['image_130']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['section_79']} flex-col justify-between`}>
            <div className={`${styles['box_149']} flex-row`}>
              <div className={`${styles['box_150']} flex-col`}>
                <div className={`${styles['group_210']} flex-row justify-end`}>
                  <span className={`${styles['text_389']}`}>扫描结束（0s）</span>
                  <div className={`${styles['group_211']} flex-col`}>
                    <div className={`${styles['image-text_11']} flex-col justify-between`}>
                      <div className={`${styles['section_80']} flex-col`}>
                        <div className={`${styles['group_212']} flex-col`}>
                          <div className={`${styles['box_151']} flex-col`}>
                            <div className={`${styles['section_81']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['label_159']}`}
                            src={
                              require('./assets/img/SketchPnge9aad61b9905f3791f59dd27f26c3a5bc61e1b72760c2a1be6d7cba64b78a2ca.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_14']} flex-col justify-between`}>
                        <span className={`${styles['text_390']}`}>AS1101</span>
                        <span className={`${styles['text_391']}`}>AStar</span>
                      </div>
                    </div>
                    <img
                      className={`${styles['thumbnail_122']}`}
                      src={
                        require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_87']} flex-col`}>
                      <span className={`${styles['text_392']}`}>Shop</span>
                    </div>
                  </div>
                  <div className={`${styles['group_213']} flex-col`}>
                    <div className={`${styles['image-text_12']} flex-col justify-between`}>
                      <div className={`${styles['group_214']} flex-col`}>
                        <div className={`${styles['image-wrapper_105']} flex-col`}>
                          <img
                            className={`${styles['label_160']}`}
                            src={
                              require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_15']} flex-col justify-between`}>
                        <span className={`${styles['text_393']}`}>AS1102</span>
                        <span className={`${styles['text_394']}`}>AStar</span>
                      </div>
                    </div>
                    <div className={`${styles['image-wrapper_106']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_123']}`}
                        src={
                          require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_124']}`}
                        src={
                          require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-wrapper_88']} flex-col`}>
                      <span className={`${styles['text_395']}`}>Shop</span>
                    </div>
                  </div>
                  <div className={`${styles['group_215']} flex-col`}>
                    <div className={`${styles['image-text_13']} flex-col justify-between`}>
                      <div className={`${styles['box_152']} flex-col`}>
                        <div className={`${styles['image-wrapper_107']} flex-col`}>
                          <img
                            className={`${styles['label_161']}`}
                            src={
                              require('./assets/img/SketchPng1e1a8864a6a4abb319d35382e339ca1b85fcc4778ee9fe60565ae5f777f86d45.png')
                            }
                          />
                        </div>
                      </div>
                      <div className={`${styles['text-group_16']} flex-col justify-between`}>
                        <span className={`${styles['text_396']}`}>AS1100</span>
                        <span className={`${styles['text_397']}`}>AStar</span>
                      </div>
                    </div>
                    <div className={`${styles['image-wrapper_108']} flex-row justify-between`}>
                      <img
                        className={`${styles['thumbnail_125']}`}
                        src={
                          require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                        }
                      />
                      <img
                        className={`${styles['thumbnail_126']}`}
                        src={
                          require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-wrapper_89']} flex-col`}>
                      <span className={`${styles['text_398']}`}>Shop</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['group_216']} flex-col`}>
                  <div className={`${styles['group_217']} flex-row`}>
                    <span className={`${styles['text_399']}`}>9:28</span>
                    <img
                      className={`${styles['thumbnail_127']}`}
                      src={
                        require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                      }
                    />
                    <img
                      className={`${styles['thumbnail_128']}`}
                      src={
                        require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                      }
                    />
                    <img
                      className={`${styles['image_131']}`}
                      src={
                        require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_218']} flex-row`}>
                    <div className={`${styles['group_219']} flex-col`}>
                      <div className={`${styles['image-wrapper_109']} flex-col`}>
                        <img
                          className={`${styles['label_162']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_400']}`}>添加设备</span>
                  </div>
                  <div className={`${styles['group_220']} flex-row`}>
                    <img
                      className={`${styles['label_163']}`}
                      src={
                        require('./assets/img/SketchPng5f76487c7932168b84aa08e6be0d0813ae645da680699b18054b88fefd07eda9.png')
                      }
                    />
                    <div className={`${styles['text-wrapper_90']}`}>
                      <span className={`${styles['text_401']}`}>发现设备</span>
                      <span className={`${styles['text_402']}`}>4</span>
                    </div>
                    <div className={`${styles['text-wrapper_91']} flex-col`}>
                      <span className={`${styles['text_403']}`}>重新扫描</span>
                    </div>
                  </div>
                  <div className={`${styles['group_221']} flex-row`}>
                    <div className={`${styles['box_153']} flex-col`}>
                      <div className={`${styles['box_154']} flex-col`}>
                        <div className={`${styles['section_82']} flex-col`}>
                          <div className={`${styles['section_83']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_132']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_92']} flex-col`}>
                      <span className={`${styles['text_404']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_405']}`}>RW-400PRO</span>
                      <span className={`${styles['text_406']}`}>SN.:&nbsp;R26073100012607310001</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_129']}`}
                      src={
                        require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                      }
                    />
                    <img
                      className={`${styles['image_133']}`}
                      src={
                        require('./assets/img/SketchPng9200c69dd618ebcc42086a6c5a1fb46b252dd727448185d6b5046a2e17cd1e86.png')
                      }
                    />
                    <img
                      className={`${styles['image_134']}`}
                      src={
                        require('./assets/img/SketchPngba26ede6ab9685c1ead5c797f26bc80404f023c85e7ef85a57caa7f0796747d6.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_222']} flex-row`}>
                    <div className={`${styles['group_223']} flex-col`}>
                      <div className={`${styles['image-wrapper_110']} flex-col`}>
                        <img
                          className={`${styles['image_135']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_136']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-wrapper_93']} flex-col`}>
                      <span className={`${styles['text_407']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_408']}`}>RW-400PRO</span>
                      <span className={`${styles['text_409']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_130']}`}
                      src={
                        require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_224']} flex-row`}>
                    <div className={`${styles['box_155']} flex-col`}>
                      <div className={`${styles['image-wrapper_111']} flex-col`}>
                        <img
                          className={`${styles['image_137']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_138']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-wrapper_94']} flex-col`}>
                      <span className={`${styles['text_410']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_411']}`}>RW-400PRO</span>
                      <span className={`${styles['text_412']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_131']}`}
                      src={
                        require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_225']} flex-row`}>
                    <div className={`${styles['group_226']} flex-col`}>
                      <div className={`${styles['image-wrapper_112']} flex-col`}>
                        <img
                          className={`${styles['image_139']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_140']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-wrapper_95']} flex-col`}>
                      <span className={`${styles['text_413']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_414']}`}>RW-400PRO</span>
                      <span className={`${styles['text_415']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_132']}`}
                      src={
                        require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text_416']}`}>搜不到设备？手动添加</span>
                  <span className={`${styles['text_417']}`}>风扇：</span>
                </div>
              </div>
              <div className={`${styles['text-wrapper_96']} flex-col justify-between`}>
                <span className={`${styles['text_418']}`}>未链接Wi-Fi</span>
                <span className={`${styles['text_419']}`}>已链接Wi-Fi</span>
              </div>
              <div className={`${styles['box_156']} flex-col justify-between`}>
                <div className={`${styles['group_227']} flex-col`}>
                  <div className={`${styles['section_84']} flex-row`}>
                    <span className={`${styles['text_420']}`}>9:28</span>
                    <img
                      className={`${styles['thumbnail_133']}`}
                      src={
                        require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                      }
                    />
                    <img
                      className={`${styles['thumbnail_134']}`}
                      src={
                        require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                      }
                    />
                    <img
                      className={`${styles['image_141']}`}
                      src={
                        require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_85']} flex-row`}>
                    <div className={`${styles['section_86']} flex-col`}>
                      <div className={`${styles['image-wrapper_113']} flex-col`}>
                        <img
                          className={`${styles['label_164']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_421']}`}>添加设备</span>
                  </div>
                  <img
                    className={`${styles['image_142']}`}
                    src={
                      require('./assets/img/SketchPng1a370f597e84a09f862484fe4c5895d9e94f9e09a2b480a116b92a4fbe2d60ca.png')
                    }
                  />
                  <span className={`${styles['text_422']}`}>连接Wi-Fi网络</span>
                  <span className={`${styles['paragraph_14']}`}>
                    *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                    <br />
                    请勿开启5GH频段。
                  </span>
                  <div className={`${styles['image-wrapper_114']} flex-col`}>
                    <img
                      className={`${styles['label_165']}`}
                      src={
                        require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text_423']}`}>没有连接到家庭Wi-Fi</span>
                  <div className={`${styles['section_87']} flex-row`}>
                    <img
                      className={`${styles['label_166']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text_424']}`}>请输入Wi-Fi密码</span>
                    <img
                      className={`${styles['label_167']}`}
                      src={
                        require('./assets/img/SketchPng162c90f3ab0b519c590db2c74524d9fbb3fe34693848e9f9b87ee9f7486a56e3.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-wrapper_97']} flex-col`}>
                    <span className={`${styles['text_425']}`}>FAQ</span>
                  </div>
                  <div className={`${styles['text-wrapper_98']} flex-col`}>
                    <span className={`${styles['text_426']}`}>下一步</span>
                  </div>
                  <img
                    className={`${styles['image_143']}`}
                    src={
                      require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                    }
                  />
                </div>
                <span className={`${styles['text_427']}`}>未链接Wi-Fi</span>
              </div>
              <img
                className={`${styles['image_144']}`}
                src={
                  require('./assets/img/SketchPngbb67e1018c952406d498e7d9c220fc9eb05d03408361453b038b3799078eb4ab.png')
                }
              />
              <img
                className={`${styles['image_145']}`}
                src={
                  require('./assets/img/SketchPng79cc7fe77837f605ae73be43376e8523b28b412bc42d574f500d8551f5d2c7ba.png')
                }
              />
              <div className={`${styles['box_157']} flex-col justify-between`}>
                <div className={`${styles['group_228']} flex-col`}>
                  <div className={`${styles['group_229']} flex-row`}>
                    <span className={`${styles['text_428']}`}>9:28</span>
                    <img
                      className={`${styles['thumbnail_135']}`}
                      src={
                        require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                      }
                    />
                    <img
                      className={`${styles['thumbnail_136']}`}
                      src={
                        require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                      }
                    />
                    <img
                      className={`${styles['image_146']}`}
                      src={
                        require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_230']} flex-row`}>
                    <div className={`${styles['group_231']} flex-col`}>
                      <div className={`${styles['image-wrapper_115']} flex-col`}>
                        <img
                          className={`${styles['label_168']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_429']}`}>添加设备</span>
                  </div>
                  <img
                    className={`${styles['image_147']}`}
                    src={
                      require('./assets/img/SketchPngfc055759d5bc283e817a0cc1ebbc9b6136c666d5674405a25815edfdea0baff5.png')
                    }
                  />
                  <span className={`${styles['text_430']}`}>连接Wi-Fi网络</span>
                  <span className={`${styles['paragraph_15']}`}>
                    *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                    <br />
                    请勿开启5GH频段。
                  </span>
                  <img
                    className={`${styles['image_148']}`}
                    src={
                      require('./assets/img/SketchPngb801f99351edeb0a9763668f6e412a56f630748c997d65ffb3faa3a3ec320ffa.png')
                    }
                  />
                  <div className={`${styles['group_232']} flex-row`}>
                    <img
                      className={`${styles['label_169']}`}
                      src={
                        require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                      }
                    />
                    <span className={`${styles['text_431']}`}>ROWAN-office</span>
                    <img
                      className={`${styles['image_149']}`}
                      src={
                        require('./assets/img/SketchPng605640477c44bdd30dfc95f9a7da4e4cb031d0bb3d80101fc9cb679191aeff08.png')
                      }
                    />
                  </div>
                  <div className={`${styles['group_233']} flex-row`}>
                    <img
                      className={`${styles['label_170']}`}
                      src={
                        require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                      }
                    />
                    <span className={`${styles['text_432']}`}>请输入Wi-Fi密码</span>
                    <img
                      className={`${styles['label_171']}`}
                      src={
                        require('./assets/img/SketchPng162c90f3ab0b519c590db2c74524d9fbb3fe34693848e9f9b87ee9f7486a56e3.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-wrapper_99']} flex-col`}>
                    <span className={`${styles['text_433']}`}>FAQ</span>
                  </div>
                  <div className={`${styles['text-wrapper_100']} flex-col`}>
                    <span className={`${styles['text_434']}`}>下一步</span>
                  </div>
                  <img
                    className={`${styles['image_150']}`}
                    src={
                      require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                    }
                  />
                </div>
                <span className={`${styles['text_435']}`}>输入密码</span>
              </div>
              <div className={`${styles['box_158']} flex-col`}>
                <div className={`${styles['group_234']} flex-row`}>
                  <span className={`${styles['text_436']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_137']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_138']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_151']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['group_235']} flex-row`}>
                  <div className={`${styles['box_159']} flex-col`}>
                    <div className={`${styles['image-wrapper_116']} flex-col`}>
                      <img
                        className={`${styles['label_172']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_437']}`}>添加设备</span>
                </div>
                <span className={`${styles['text_438']}`}>连接Wi-Fi网络</span>
                <span className={`${styles['paragraph_16']}`}>
                  *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                  <br />
                  请勿开启5GH频段。
                </span>
                <div className={`${styles['group_236']} flex-row`}>
                  <img
                    className={`${styles['label_173']}`}
                    src={
                      require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                    }
                  />
                  <span className={`${styles['text_439']}`}>ROWAN-office</span>
                </div>
                <div className={`${styles['group_237']} flex-row`}>
                  <img
                    className={`${styles['label_174']}`}
                    src={
                      require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                    }
                  />
                  <span className={`${styles['text_440']}`}>123456788</span>
                </div>
                <img
                  className={`${styles['image_152']}`}
                  src={
                    require('./assets/img/SketchPngb801f99351edeb0a9763668f6e412a56f630748c997d65ffb3faa3a3ec320ffa.png')
                  }
                />
                <div className={`${styles['text-wrapper_101']} flex-col`}>
                  <span className={`${styles['text_441']}`}>FAQ</span>
                </div>
                <div className={`${styles['text-wrapper_102']} flex-col`}>
                  <span className={`${styles['text_442']}`}>下一步</span>
                </div>
                <img
                  className={`${styles['image_153']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
                <img
                  className={`${styles['image_154']}`}
                  src={
                    require('./assets/img/SketchPng4a3d75a8aab6589e08a078efc11e60c42f070d19b60f92184b4d0c8070c47653.png')
                  }
                />
              </div>
              <div className={`${styles['box_160']} flex-col`}>
                <div className={`${styles['section_88']} flex-row`}>
                  <span className={`${styles['text_443']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_139']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_140']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_155']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['section_89']} flex-row`}>
                  <div className={`${styles['group_238']} flex-col`}>
                    <div className={`${styles['image-wrapper_117']} flex-col`}>
                      <img
                        className={`${styles['label_175']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_444']}`}>添加设备</span>
                </div>
                <img
                  className={`${styles['image_156']}`}
                  src={
                    require('./assets/img/SketchPngfc055759d5bc283e817a0cc1ebbc9b6136c666d5674405a25815edfdea0baff5.png')
                  }
                />
                <span className={`${styles['text_445']}`}>连接Wi-Fi网络</span>
                <span className={`${styles['paragraph_17']}`}>
                  *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                  <br />
                  请勿开启5GH频段。
                </span>
                <img
                  className={`${styles['image_157']}`}
                  src={
                    require('./assets/img/SketchPngb801f99351edeb0a9763668f6e412a56f630748c997d65ffb3faa3a3ec320ffa.png')
                  }
                />
                <div className={`${styles['section_90']} flex-row`}>
                  <img
                    className={`${styles['label_176']}`}
                    src={
                      require('./assets/img/SketchPnga70373bb6133ec980bcd376b2a40bcda00ba81e35a6a05ecf2a6bb3b3e1be31b.png')
                    }
                  />
                  <span className={`${styles['text_446']}`}>ROWAN-office</span>
                </div>
                <div className={`${styles['section_91']} flex-row`}>
                  <img
                    className={`${styles['label_177']}`}
                    src={
                      require('./assets/img/SketchPng7e24f80ec8e64e5e6d8949ff7506c5dc1a1dc3e26d7cd350f3ba994b178befb7.png')
                    }
                  />
                  <span className={`${styles['text_447']}`}>**********</span>
                  <img
                    className={`${styles['label_178']}`}
                    src={
                      require('./assets/img/SketchPng162c90f3ab0b519c590db2c74524d9fbb3fe34693848e9f9b87ee9f7486a56e3.png')
                    }
                  />
                </div>
                <div className={`${styles['text-wrapper_103']} flex-col`}>
                  <span className={`${styles['text_448']}`}>FAQ</span>
                </div>
                <div className={`${styles['text-wrapper_104']} flex-col`}>
                  <span className={`${styles['text_449']}`}>下一步</span>
                </div>
                <img
                  className={`${styles['image_158']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <div className={`${styles['box_161']} flex-col justify-between`}>
                <div className={`${styles['block_68']} flex-col`}>
                  <div className={`${styles['section_92']} flex-row`}>
                    <span className={`${styles['text_450']}`}>9:28</span>
                    <img
                      className={`${styles['thumbnail_141']}`}
                      src={
                        require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                      }
                    />
                    <img
                      className={`${styles['thumbnail_142']}`}
                      src={
                        require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                      }
                    />
                    <img
                      className={`${styles['image_159']}`}
                      src={
                        require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_93']} flex-row`}>
                    <div className={`${styles['box_162']} flex-col`}>
                      <div className={`${styles['image-wrapper_118']} flex-col`}>
                        <img
                          className={`${styles['label_179']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text_451']}`}>添加设备</span>
                  </div>
                  <div className={`${styles['section_94']} flex-row`}>
                    <span className={`${styles['text_452']}`}>%</span>
                    <div className={`${styles['group_239']} flex-row`}>
                      <img
                        className={`${styles['image_160']}`}
                        src={
                          require('./assets/img/SketchPng2cb96d9848d6887bb2f1ae527c9c05e5b5ff40e3713e3dedad8b75418a243cb9.png')
                        }
                      />
                      <span className={`${styles['text_453']}`}>45</span>
                      <div className={`${styles['group_240']} flex-col`}>
                        <div className={`${styles['section_95']} flex-col`}>
                          <div className={`${styles['block_69']} flex-col`}>
                            <div className={`${styles['group_241']} flex-col`} />
                          </div>
                          <img
                            className={`${styles['image_161']}`}
                            src={
                              require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`${styles['text_454']}`}>连接中…</span>
                  <span className={`${styles['text_455']}`}>*请确保您的Wi-Fi网络信号良好：</span>
                  <div className={`${styles['section_96']} flex-row justify-between`}>
                    <span className={`${styles['text_456']}`}>连接至设备热点</span>
                    <img
                      className={`${styles['thumbnail_143']}`}
                      src={
                        require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_97']} flex-row justify-between`}>
                    <span className={`${styles['text_457']}`}>发送Wi-Fi认证至设备</span>
                    <img
                      className={`${styles['thumbnail_144']}`}
                      src={
                        require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_98']} flex-row justify-between`}>
                    <span className={`${styles['text_458']}`}>连接至家庭Wi-Fi</span>
                    <img
                      className={`${styles['thumbnail_145']}`}
                      src={
                        require('./assets/img/SketchPngf7d11d80cdd3e436c8a143a8a1beda1281346587aac2806eea36eaf1ef197cc5.png')
                      }
                    />
                  </div>
                  <div className={`${styles['section_99']} flex-row justify-between`}>
                    <span className={`${styles['text_459']}`}>绑定设备</span>
                    <div className={`${styles['group_242']} flex-col`} />
                  </div>
                  <img
                    className={`${styles['image_162']}`}
                    src={
                      require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                    }
                  />
                  <img
                    className={`${styles['image_163']}`}
                    src={
                      require('./assets/img/SketchPng1d365b558ddca25c9ba003cd844eb2fb9065e77d4c272c86c10aec34b3384fc2.png')
                    }
                  />
                </div>
                <span className={`${styles['text_460']}`}>链接中</span>
              </div>
            </div>
            <div className={`${styles['box_163']} flex-row`}>
              <div className={`${styles['box_164']} flex-col`}>
                <div className={`${styles['box_165']} flex-row`}>
                  <span className={`${styles['text_461']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_146']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_147']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_164']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['box_166']} flex-row`}>
                  <div className={`${styles['image-text_14']} flex-row justify-between`}>
                    <div className={`${styles['block_70']} flex-col`}>
                      <div className={`${styles['image-wrapper_119']} flex-col`}>
                        <img
                          className={`${styles['label_180']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_17']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_165']}`}
                  src={
                    require('./assets/img/SketchPngb54a2da572483abf4417c0996b9912a999772feb8a100afa8107f4f0275887e7.png')
                  }
                />
                <div className={`${styles['text-group_18']} flex-col justify-between`}>
                  <span className={`${styles['text_462']}`}>未发现设备</span>
                  <span className={`${styles['text_463']}`}>请保持设备已接通电源，并在附近</span>
                </div>
                <div className={`${styles['text-wrapper_105']} flex-col`}>
                  <span className={`${styles['text_464']}`}>重新扫描</span>
                </div>
                <div className={`${styles['image-wrapper_120']} flex-col`}>
                  <img
                    className={`${styles['image_166']}`}
                    src={
                      require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['paragraph_18']}`}>
                1、发现设备列表置顶，扫描动画自动消失
                <br />
                2、已发现设备总数
              </span>
              <div className={`${styles['box_167']} flex-col`}>
                <div className={`${styles['image-text_15']} flex-col justify-between`}>
                  <div className={`${styles['box_168']} flex-col`}>
                    <div className={`${styles['group_243']} flex-col`}>
                      <div className={`${styles['group_244']} flex-col`}>
                        <div className={`${styles['group_245']} flex-col`} />
                      </div>
                      <img
                        className={`${styles['label_181']}`}
                        src={
                          require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-group_19']} flex-col justify-between`}>
                    <span className={`${styles['text_465']}`}>AS1103</span>
                    <span className={`${styles['text_466']}`}>AStar</span>
                  </div>
                </div>
                <img
                  className={`${styles['thumbnail_148']}`}
                  src={
                    require('./assets/img/SketchPng2b58c33d4be82da53b902ea6d2832767b280ba4dc4f4e6820ae2431c8017b431.png')
                  }
                />
                <div className={`${styles['text-wrapper_106']} flex-col`}>
                  <span className={`${styles['text_467']}`}>Shop</span>
                </div>
              </div>
              <div className={`${styles['box_169']} flex-col`}>
                <div className={`${styles['block_71']} flex-row`}>
                  <span className={`${styles['text_468']}`}>9:28</span>
                  <img
                    className={`${styles['thumbnail_149']}`}
                    src={
                      require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_150']}`}
                    src={
                      require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                    }
                  />
                  <img
                    className={`${styles['image_167']}`}
                    src={
                      require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                    }
                  />
                </div>
                <div className={`${styles['block_72']} flex-row`}>
                  <div className={`${styles['image-text_16']} flex-row justify-between`}>
                    <div className={`${styles['group_246']} flex-col`}>
                      <div className={`${styles['image-wrapper_121']} flex-col`}>
                        <img
                          className={`${styles['label_182']}`}
                          src={
                            require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                          }
                        />
                      </div>
                    </div>
                    <span className={`${styles['text-group_20']}`}>添加设备</span>
                  </div>
                </div>
                <img
                  className={`${styles['image_168']}`}
                  src={
                    require('./assets/img/SketchPngb54a2da572483abf4417c0996b9912a999772feb8a100afa8107f4f0275887e7.png')
                  }
                />
                <div className={`${styles['text-group_21']} flex-col justify-between`}>
                  <div className={`${styles['text-wrapper_107']}`}>
                    <span className={`${styles['text_469']}`}>发现设备</span>
                    <span className={`${styles['text_470']}`}>2</span>
                  </div>
                  <span className={`${styles['text_471']}`}>请保持设备已接通电源，并在附近</span>
                </div>
                <div className={`${styles['block_73']} flex-row`}>
                  <div className={`${styles['image-text_17']} flex-row justify-between`}>
                    <div className={`${styles['group_247']} flex-col`}>
                      <div className={`${styles['box_170']} flex-col`}>
                        <div className={`${styles['block_74']} flex-col`}>
                          <div className={`${styles['group_248']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_169']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_22']} flex-col`}>
                      <span className={`${styles['text_472']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_473']}`}>RW-400PRO</span>
                      <span className={`${styles['text_474']}`}>SN.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_151']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['block_75']} flex-row`}>
                  <div className={`${styles['image-text_18']} flex-row justify-between`}>
                    <div className={`${styles['block_76']} flex-col align-center`}>
                      <div className={`${styles['box_171']} flex-col`}>
                        <div className={`${styles['image-wrapper_122']} flex-col`}>
                          <img
                            className={`${styles['image_170']}`}
                            src={
                              require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                            }
                          />
                        </div>
                        <img
                          className={`${styles['image_171']}`}
                          src={
                            require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_23']} flex-col`}>
                      <span className={`${styles['text_475']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_476']}`}>RW-400PRO</span>
                      <span className={`${styles['text_477']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_152']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <img
                  className={`${styles['image_172']}`}
                  src={
                    require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                  }
                />
              </div>
              <span className={`${styles['text_478']}`}>未连接有效Wi-Fi则出现弹窗提示</span>
              <img
                className={`${styles['image_173']}`}
                src={
                  require('./assets/img/SketchPng749b89588b5d370295941d625fa470f9a54ae7aa8c39f8b2fe4c0a00b723f6f5.png')
                }
              />
              <span className={`${styles['text_479']}`}>扫描失败</span>
              <div className={`${styles['box_172']} flex-col`}>
                <div className={`${styles['box_173']} flex-row`}>
                  <div className={`${styles['image-text_19']} flex-row justify-between`}>
                    <div className={`${styles['group_249']} flex-col`}>
                      <div className={`${styles['group_250']} flex-col`}>
                        <img
                          className={`${styles['image_174']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                        <div className={`${styles['group_251']} flex-col justify-between`}>
                          <div className={`${styles['section_100']} flex-row`}>
                            <span className={`${styles['text_480']}`}>9:28</span>
                            <img
                              className={`${styles['thumbnail_153']}`}
                              src={
                                require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                              }
                            />
                            <img
                              className={`${styles['thumbnail_154']}`}
                              src={
                                require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                              }
                            />
                            <img
                              className={`${styles['image_175']}`}
                              src={
                                require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                              }
                            />
                          </div>
                          <div className={`${styles['section_101']} flex-row`}>
                            <div className={`${styles['image-text_20']} flex-row justify-between`}>
                              <div className={`${styles['box_174']} flex-col`}>
                                <div className={`${styles['image-wrapper_123']} flex-col`}>
                                  <img
                                    className={`${styles['label_183']}`}
                                    src={
                                      require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                                    }
                                  />
                                </div>
                              </div>
                              <span className={`${styles['text-group_24']}`}>添加设备</span>
                            </div>
                            <div className={`${styles['image-text_21']} flex-row justify-between`}>
                              <div className={`${styles['box_174']} flex-col`}>
                                <div className={`${styles['image-wrapper_123']} flex-col`}>
                                  <img
                                    className={`${styles['label_183']}`}
                                    src={
                                      require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                                    }
                                  />
                                </div>
                              </div>
                              <span className={`${styles['text-group_24']}`}>添加设备</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <img
                        className={`${styles['image_176']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_25']} flex-col`}>
                      <span className={`${styles['text_481']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_482']}`}>RW-400PRO</span>
                      <span className={`${styles['text_483']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_155']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_175']} flex-row`}>
                  <div className={`${styles['image-text_22']} flex-row justify-between`}>
                    <div className={`${styles['box_176']} flex-col`}>
                      <div className={`${styles['block_77']} flex-col`}>
                        <div className={`${styles['box_177']} flex-col`}>
                          <div className={`${styles['section_102']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_177']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_26']} flex-col`}>
                      <span className={`${styles['text_484']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_485']}`}>RW-400PRO</span>
                      <span className={`${styles['text_486']}`}>SN.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_156']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_178']} flex-row`}>
                  <div className={`${styles['image-text_23']} flex-row justify-between`}>
                    <div className={`${styles['section_103']} flex-col`}>
                      <div className={`${styles['image-wrapper_124']} flex-col`}>
                        <img
                          className={`${styles['image_178']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_179']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_27']} flex-col`}>
                      <span className={`${styles['text_487']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_488']}`}>RW-400PRO</span>
                      <span className={`${styles['text_489']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_157']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_179']} flex-row`}>
                  <div className={`${styles['image-text_24']} flex-row justify-between`}>
                    <div className={`${styles['block_78']} flex-col`}>
                      <div className={`${styles['group_252']} flex-col`}>
                        <div className={`${styles['box_180']} flex-col`}>
                          <div className={`${styles['section_104']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_180']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_28']} flex-col`}>
                      <span className={`${styles['text_490']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_491']}`}>RW-400PRO</span>
                      <span className={`${styles['text_492']}`}>SN.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_158']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_181']} flex-row`}>
                  <div className={`${styles['image-text_25']} flex-row justify-between`}>
                    <div className={`${styles['group_253']} flex-col`}>
                      <div className={`${styles['image-wrapper_125']} flex-col`}>
                        <img
                          className={`${styles['image_181']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_182']}`}
                        src={
                          require('./assets/img/SketchPng796562c2d7662f52a34ccf43e2e0de9c2b0de4475b4aabe1a8b303f28d52f883.png')
                        }
                      />
                    </div>
                    <div className={`${styles['text-group_29']} flex-col`}>
                      <span className={`${styles['text_493']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_494']}`}>RW-400PRO</span>
                      <span className={`${styles['text_495']}`}>MAC.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_159']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_182']} flex-row`}>
                  <div className={`${styles['image-text_26']} flex-row justify-between`}>
                    <div className={`${styles['block_79']} flex-col`}>
                      <div className={`${styles['box_183']} flex-col`}>
                        <div className={`${styles['group_254']} flex-col`}>
                          <div className={`${styles['group_255']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_183']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-group_30']} flex-col`}>
                      <span className={`${styles['text_496']}`}>Air&nbsp;Conditioner</span>
                      <span className={`${styles['text_497']}`}>RW-400PRO</span>
                      <span className={`${styles['text_498']}`}>SN.:&nbsp;R26073100012607310001</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['thumbnail_160']}`}
                    src={
                      require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                    }
                  />
                </div>
                <div className={`${styles['box_184']} flex-col justify-end`}>
                  <div className={`${styles['text-group_31']} flex-col justify-between`}>
                    <div className={`${styles['text-wrapper_108']}`}>
                      <span className={`${styles['text_499']}`}>发现设备</span>
                      <span className={`${styles['text_500']}`}>10</span>
                    </div>
                    <span className={`${styles['text_501']}`}>请保持设备已接通电源，并在附近</span>
                  </div>
                  <div className={`${styles['text-wrapper_109']} flex-col`}>
                    <span className={`${styles['text_502']}`}>重新扫描</span>
                  </div>
                  <img
                    className={`${styles['image_184']}`}
                    src={
                      require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_185']} flex-row`}>
                <div className={`${styles['group_256']} flex-col`} />
                <div className={`${styles['text-group_32']} flex-col`}>
                  <span className={`${styles['text_503']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_504']}`}>RW-400PRO</span>
                  <span className={`${styles['text_505']}`}>SN.:&nbsp;R26073100012607310001</span>
                </div>
                <img
                  className={`${styles['thumbnail_161']}`}
                  src={
                    require('./assets/img/SketchPng29a976843399ce42a0162512733351e1785d02199d0490b261db0ff46852747e.png')
                  }
                />
                <div className={`${styles['group_257']} flex-col`}>
                  <div className={`${styles['group_258']} flex-col`}>
                    <div className={`${styles['group_259']} flex-col`} />
                  </div>
                  <img
                    className={`${styles['image_185']}`}
                    src={
                      require('./assets/img/SketchPng5bf36a31163efbb9b5b561adb692794a0177ea157cc929165a96a60f4ddb0828.png')
                    }
                  />
                </div>
              </div>
              <span className={`${styles['paragraph_19']}`}>
                *注意：本产品仅支持2.4GHz的Wi-Fi网络，
                <br />
                请勿开启5GH频段。
              </span>
              <span className={`${styles['text_506']}`}>点击卡片去链接</span>
              <span className={`${styles['text_507']}`}>输入正确密码才能激活下一步按钮</span>
              <img
                className={`${styles['image_186']}`}
                src={
                  require('./assets/img/SketchPng711feb112a4ecb30cf5338d1169b9badb446d6bb923dcadda9569f2231345657.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['section_105']} flex-col justify-between`}>
            <div className={`${styles['block_80']} flex-col`}>
              <div className={`${styles['section_106']} flex-row`}>
                <span className={`${styles['text_508']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_162']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_163']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_187']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['section_107']} flex-row`}>
                <div className={`${styles['box_186']} flex-col`}>
                  <div className={`${styles['image-wrapper_126']} flex-col`}>
                    <img
                      className={`${styles['label_184']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_509']}`}>添加设备</span>
              </div>
              <div className={`${styles['section_108']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_110']} flex-row`}>
                  <span className={`${styles['text_510']}`}>45</span>
                  <span className={`${styles['text_511']}`}>%</span>
                </div>
                <span className={`${styles['text_512']}`}>请确保您的Wi-Fi网络信号良好</span>
              </div>
              <div className={`${styles['section_109']} flex-row justify-between`}>
                <span className={`${styles['text_513']}`}>连接设备（123456789012）</span>
                <img
                  className={`${styles['thumbnail_164']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_110']} flex-row justify-between`}>
                <span className={`${styles['text_514']}`}>验证设备</span>
                <img
                  className={`${styles['thumbnail_165']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_111']} flex-row justify-between`}>
                <span className={`${styles['text_515']}`}>发送Wi-Fi信息</span>
                <img
                  className={`${styles['thumbnail_166']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_112']} flex-row justify-between`}>
                <span className={`${styles['text_516']}`}>设备开始连接路由器</span>
                <img
                  className={`${styles['thumbnail_167']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_113']} flex-row justify-between`}>
                <span className={`${styles['text_517']}`}>设备开始激活</span>
                <img
                  className={`${styles['thumbnail_168']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_114']} flex-row justify-between`}>
                <span className={`${styles['text_518']}`}>设备开始绑定</span>
                <img
                  className={`${styles['thumbnail_169']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_115']} flex-row justify-between`}>
                <span className={`${styles['text_519']}`}>设备开始下载证书</span>
                <img
                  className={`${styles['thumbnail_170']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_116']} flex-row justify-between`}>
                <span className={`${styles['text_520']}`}>设备开始连接服务器</span>
                <img
                  className={`${styles['thumbnail_171']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_117']} flex-row justify-between`}>
                <span className={`${styles['text_521']}`}>连接设备（123456789012）</span>
                <img
                  className={`${styles['thumbnail_172']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_118']} flex-row justify-between`}>
                <span className={`${styles['text_522']}`}>验证设备</span>
                <img
                  className={`${styles['thumbnail_173']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_119']} flex-row justify-between`}>
                <span className={`${styles['text_523']}`}>发送Wi-Fi信息</span>
                <img
                  className={`${styles['thumbnail_174']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_120']} flex-row justify-between`}>
                <span className={`${styles['text_524']}`}>设备开始连接路由器</span>
                <img
                  className={`${styles['thumbnail_175']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_121']} flex-row justify-between`}>
                <span className={`${styles['text_525']}`}>设备开始激活</span>
                <img
                  className={`${styles['thumbnail_176']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_122']} flex-row justify-between`}>
                <span className={`${styles['text_526']}`}>设备开始绑定</span>
                <img
                  className={`${styles['thumbnail_177']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_123']} flex-row justify-between`}>
                <span className={`${styles['text_527']}`}>设备开始下载证书</span>
                <img
                  className={`${styles['thumbnail_178']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_124']} flex-row justify-between`}>
                <span className={`${styles['text_528']}`}>设备开始连接路由器</span>
                <img
                  className={`${styles['thumbnail_179']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_125']} flex-row justify-between`}>
                <span className={`${styles['text_529']}`}>设备开始激活</span>
                <img
                  className={`${styles['thumbnail_180']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['section_126']} flex-row justify-between`}>
                <div className={`${styles['text-group_33']} flex-col justify-between`}>
                  <span className={`${styles['text_530']}`}>设备开始绑定</span>
                  <span className={`${styles['text_531']}`}>设备开始下载证书</span>
                </div>
                <div className={`${styles['image-wrapper_127']} flex-col justify-between`}>
                  <img
                    className={`${styles['thumbnail_181']}`}
                    src={
                      require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_182']}`}
                    src={
                      require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                    }
                  />
                </div>
              </div>
              <img
                className={`${styles['image_188']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
            </div>
            <div className={`${styles['text-group_34']} flex-col justify-between`}>
              <span className={`${styles['text_532']}`}>数据超过一屏内容自动向上适配</span>
              <span className={`${styles['text_533']}`}>数据超过一屏内容自动向上适配</span>
            </div>
          </div>
          <div className={`${styles['text-wrapper_111']} flex-col justify-between`}>
            <span className={`${styles['text_534']}`}>链接失败</span>
            <span className={`${styles['text_535']}`}>链接成功</span>
          </div>
          <div className={`${styles['section_127']} flex-col justify-between`}>
            <div className={`${styles['group_260']} flex-col`}>
              <div className={`${styles['group_261']} flex-row`}>
                <span className={`${styles['text_536']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_183']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_184']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_189']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['group_262']} flex-row`}>
                <div className={`${styles['section_128']} flex-col`}>
                  <div className={`${styles['image-wrapper_128']} flex-col`}>
                    <img
                      className={`${styles['label_185']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_537']}`}>添加设备</span>
              </div>
              <img
                className={`${styles['image_190']}`}
                src={
                  require('./assets/img/SketchPng7ed768f831c3163f31414b3df2322fd442426e696bf49be7a937617d94761cef.png')
                }
              />
              <span className={`${styles['text_538']}`}>添加失败</span>
              <span className={`${styles['text_539']}`}>*请确保您的Wi-Fi网络信号良好：</span>
              <div className={`${styles['group_263']} flex-row justify-between`}>
                <span className={`${styles['text_540']}`}>连接至设备热点</span>
                <img
                  className={`${styles['thumbnail_185']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['group_264']} flex-row justify-between`}>
                <span className={`${styles['text_541']}`}>发送Wi-Fi认证至设备</span>
                <img
                  className={`${styles['thumbnail_186']}`}
                  src={
                    require('./assets/img/SketchPng5844f8e4410e580499c2edf321186234ea5db90d6c397c82d1ea1241a7c7ac3a.png')
                  }
                />
              </div>
              <div className={`${styles['group_265']} flex-row justify-between`}>
                <span className={`${styles['text_542']}`}>连接至家庭Wi-Fi</span>
                <img
                  className={`${styles['thumbnail_187']}`}
                  src={
                    require('./assets/img/SketchPngfbf4ab0ddb35947b473c05f644cd4777873b90ae36312d4b4c009e21d7105193.png')
                  }
                />
              </div>
              <div className={`${styles['group_266']} flex-row justify-between`}>
                <span className={`${styles['text_543']}`}>绑定设备</span>
                <div className={`${styles['block_81']} flex-col`} />
              </div>
              <div className={`${styles['group_267']} flex-col`}>
                <span className={`${styles['text_544']}`}>再次配网</span>
                <img
                  className={`${styles['image_191']}`}
                  src={
                    require('./assets/img/SketchPng9a00f0ea0abbfe59aed9308754976fd4501aecc744dac99af6877905177b6ab1.png')
                  }
                />
              </div>
              <img
                className={`${styles['image_192']}`}
                src={
                  require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                }
              />
              <div className={`${styles['text-wrapper_112']} flex-row`}>
                <span className={`${styles['text_545']}`}>0</span>
                <span className={`${styles['text_546']}`}>%</span>
              </div>
              <img
                className={`${styles['image_193']}`}
                src={
                  require('./assets/img/SketchPng1d365b558ddca25c9ba003cd844eb2fb9065e77d4c272c86c10aec34b3384fc2.png')
                }
              />
            </div>
            <div className={`${styles['text-group_35']} flex-col justify-between`}>
              <span className={`${styles['text_547']}`}>链接失败</span>
              <span className={`${styles['text_548']}`}>显示失败的节点，且出现状态图</span>
            </div>
          </div>
          <div className={`${styles['section_129']} flex-col`}>
            <div className={`${styles['box_187']} flex-col`}>
              <div className={`${styles['group_268']} flex-row`}>
                <span className={`${styles['text_549']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_188']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_189']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_194']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['group_269']} flex-row`}>
                <div className={`${styles['box_188']} flex-col`}>
                  <div className={`${styles['image-wrapper_129']} flex-col`}>
                    <img
                      className={`${styles['label_186']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_550']}`}>添加设备</span>
                <div className={`${styles['box_189']} flex-row`}>
                  <div className={`${styles['block_82']} flex-col`}>
                    <div className={`${styles['image-wrapper_130']} flex-col`}>
                      <img
                        className={`${styles['label_187']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_551']}`}>添加设备</span>
                </div>
              </div>
              <div className={`${styles['group_270']} flex-row justify-between`}>
                <span className={`${styles['text_552']}`}>设备昵称</span>
                <div className={`${styles['text-wrapper_113']}`}>
                  <span className={`${styles['text_553']}`}>4</span>
                  <span className={`${styles['text_554']}`}>/20</span>
                </div>
              </div>
              <div className={`${styles['group_271']} flex-row`}>
                <span className={`${styles['text_555']}`}>台面风扇</span>
                <img
                  className={`${styles['thumbnail_190']}`}
                  src={
                    require('./assets/img/SketchPngdfcf722b92cf05ce442e1b98861b539cb8d47d5f632f4e726d0ff8693fb6c30c.png')
                  }
                />
                <img
                  className={`${styles['label_188']}`}
                  src={
                    require('./assets/img/SketchPnge5b80b28cc80d94048fac9f06ca503003a44e66d817799d2382798d77a00f03f.png')
                  }
                />
              </div>
              <span className={`${styles['text_556']}`}>默认设备类型，可在此修改并设置设备名称</span>
              <div className={`${styles['group_272']} flex-row justify-between`}>
                <div className={`${styles['text-wrapper_114']} flex-col`}>
                  <span className={`${styles['text_557']}`}>不设置，跳过</span>
                </div>
                <div className={`${styles['group_273']} flex-col`}>
                  <span className={`${styles['text_558']}`}>下一步</span>
                  <img
                    className={`${styles['image_195']}`}
                    src={
                      require('./assets/img/SketchPng4505b65cf09f3caafafb582d3646e27f73fb265b811f6598e6f90900db3d3e8d.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['group_274']} flex-row`}>
                <span className={`${styles['text_559']}`}>完成</span>
                <img
                  className={`${styles['image_196']}`}
                  src={
                    require('./assets/img/SketchPngaeddbe67dc803632f31cc96c501e59fe4103cbdc889c10a5b162c5727d1a4bf6.png')
                  }
                />
              </div>
              <img
                className={`${styles['image_197']}`}
                src={
                  require('./assets/img/SketchPngfa5fa487a037b882555e4af5956997fcfc416369784364ff724c37aac9ea9597.png')
                }
              />
            </div>
            <span className={`${styles['text_560']}`}>设备命名</span>
            <span className={`${styles['paragraph_20']}`}>
              1、输入名称
              <br />
              2、跳过直接进入一下步
            </span>
          </div>
          <div className={`${styles['section_130']} flex-col`}>
            <div className={`${styles['box_190']} flex-col`}>
              <div className={`${styles['section_131']} flex-row`}>
                <span className={`${styles['text_561']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_191']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_192']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_198']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['section_132']} flex-row`}>
                <div className={`${styles['box_191']} flex-col`}>
                  <div className={`${styles['image-wrapper_131']} flex-col`}>
                    <img
                      className={`${styles['label_189']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_562']}`}>添加设备</span>
                <div className={`${styles['box_192']} flex-row`}>
                  <div className={`${styles['box_193']} flex-col`}>
                    <div className={`${styles['image-wrapper_132']} flex-col`}>
                      <img
                        className={`${styles['label_190']}`}
                        src={
                          require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                        }
                      />
                    </div>
                  </div>
                  <span className={`${styles['text_563']}`}>添加设备</span>
                </div>
              </div>
              <div className={`${styles['section_133']} flex-row justify-between`}>
                <span className={`${styles['text_564']}`}>设备昵称</span>
                <div className={`${styles['text-wrapper_115']}`}>
                  <span className={`${styles['text_565']}`}>4</span>
                  <span className={`${styles['text_566']}`}>/20</span>
                </div>
              </div>
              <div className={`${styles['section_134']} flex-row`}>
                <span className={`${styles['text_567']}`}>台面风扇</span>
                <img
                  className={`${styles['thumbnail_193']}`}
                  src={
                    require('./assets/img/SketchPngdfcf722b92cf05ce442e1b98861b539cb8d47d5f632f4e726d0ff8693fb6c30c.png')
                  }
                />
                <img
                  className={`${styles['label_191']}`}
                  src={
                    require('./assets/img/SketchPnge5b80b28cc80d94048fac9f06ca503003a44e66d817799d2382798d77a00f03f.png')
                  }
                />
              </div>
              <span className={`${styles['text_568']}`}>默认设备类型，可在此修改并设置设备名称</span>
              <span className={`${styles['text_569']}`}>下一步</span>
              <div className={`${styles['section_135']} flex-row`}>
                <span className={`${styles['text_570']}`}>完成</span>
                <img
                  className={`${styles['image_199']}`}
                  src={
                    require('./assets/img/SketchPngaeddbe67dc803632f31cc96c501e59fe4103cbdc889c10a5b162c5727d1a4bf6.png')
                  }
                />
              </div>
              <div className={`${styles['section_136']} flex-col justify-end`}>
                <div className={`${styles['text-wrapper_116']} flex-col`}>
                  <span className={`${styles['text_571']}`}>使用场景</span>
                </div>
                <div className={`${styles['section_137']} flex-col`}>
                  <div className={`${styles['box_194']} flex-col justify-between`}>
                    <div className={`${styles['block_83']} flex-col`}>
                      <div className={`${styles['block_84']} flex-row`}>
                        <span className={`${styles['text_572']}`}>客厅</span>
                        <img
                          className={`${styles['label_192']}`}
                          src={
                            require('./assets/img/SketchPng4a71f3dd6e1c3ac044d3c14c9dada3f34e8da140ca258e976ffdb816dfd3ebcd.png')
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles['text-wrapper_117']} flex-col`}>
                      <span className={`${styles['text_573']}`}>主卧</span>
                    </div>
                    <div className={`${styles['text-wrapper_118']} flex-col`}>
                      <span className={`${styles['text_574']}`}>次卧</span>
                    </div>
                    <div className={`${styles['text-wrapper_119']} flex-col`}>
                      <span className={`${styles['text_575']}`}>厨房</span>
                    </div>
                    <div className={`${styles['text-wrapper_120']} flex-col`}>
                      <span className={`${styles['text_576']}`}>浴室</span>
                    </div>
                  </div>
                </div>
                <div className={`${styles['section_138']} flex-col justify-end`}>
                  <div className={`${styles['group_275']} flex-row justify-between`}>
                    <div className={`${styles['text-wrapper_121']} flex-col`}>
                      <span className={`${styles['text_577']}`}>取消</span>
                    </div>
                    <div className={`${styles['text-wrapper_122']} flex-col`}>
                      <span className={`${styles['text_578']}`}>确定</span>
                    </div>
                  </div>
                  <img
                    className={`${styles['image_200']}`}
                    src={
                      require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
                    }
                  />
                </div>
              </div>
            </div>
            <span className={`${styles['text_579']}`}>选择房间</span>
            <span className={`${styles['paragraph_21']}`}>
              1、取消-不保存选择的房间场景
              <br />
              2、确定-保存选择的房间场景
            </span>
          </div>
          <div className={`${styles['section_139']} flex-col`}>
            <div className={`${styles['section_140']} flex-col`}>
              <div className={`${styles['box_195']} flex-row`}>
                <span className={`${styles['text_580']}`}>9:28</span>
                <img
                  className={`${styles['thumbnail_194']}`}
                  src={
                    require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_195']}`}
                  src={
                    require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                  }
                />
                <img
                  className={`${styles['image_201']}`}
                  src={
                    require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                  }
                />
              </div>
              <div className={`${styles['box_196']} flex-row`}>
                <div className={`${styles['block_85']} flex-col`}>
                  <div className={`${styles['image-wrapper_133']} flex-col`}>
                    <img
                      className={`${styles['label_193']}`}
                      src={
                        require('./assets/img/SketchPng0d9e60cf1bdf0c339af3d4fbb63936c485ecdc9cdbcd4039d5cee4e197a24ad5.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_581']}`}>示例</span>
                <img
                  className={`${styles['image_202']}`}
                  src={
                    require('./assets/img/SketchPngcd6f59ae29fec2fdd30c190898b5fc1b5cc5fd6d4643772ff66d2f63f7063883.png')
                  }
                />
              </div>
              <div className={`${styles['box_197']} flex-row`}>
                <div className={`${styles['block_86']} flex-col justify-between`}>
                  <span className={`${styles['text_582']}`}>全屋</span>
                  <div className={`${styles['section_141']} flex-col`} />
                </div>
                <span className={`${styles['text_583']}`}>客厅</span>
                <span className={`${styles['text_584']}`}>主卧</span>
                <span className={`${styles['text_585']}`}>次卧</span>
                <span className={`${styles['text_586']}`}>厨房</span>
                <img
                  className={`${styles['label_194']}`}
                  src={
                    require('./assets/img/SketchPng06f7b5ff07b585cacc1fe27d52bde3ee429782565752964b196b8739c78bfeb8.png')
                  }
                />
              </div>
              <div className={`${styles['box_198']} flex-row justify-between`}>
                <div className={`${styles['box_199']} flex-col`}>
                  <div className={`${styles['group_276']} flex-row justify-between`}>
                    <div className={`${styles['box_200']} flex-col`} />
                    <div className={`${styles['box_201']} flex-col`}>
                      <div className={`${styles['image-wrapper_134']} flex-col`}>
                        <img
                          className={`${styles['image_203']}`}
                          src={
                            require('./assets/img/SketchPng384f2071681adecf6360aa8bd2c760fad6662cac604c104f757ddb1cf7726013.png')
                          }
                        />
                      </div>
                      <img
                        className={`${styles['image_204']}`}
                        src={
                          require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                        }
                      />
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_123']} flex-row`}>
                    <span className={`${styles['text_587']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_124']} flex-row`}>
                    <span className={`${styles['text_588']}`}>RW-400PRO</span>
                  </div>
                  <div className={`${styles['image-wrapper_135']} flex-row`}>
                    <img
                      className={`${styles['label_195']}`}
                      src={
                        require('./assets/img/SketchPngca71eb7c7924364739af1d22449c33e80260e4c6b0b549d72f81a167aea1684c.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['box_202']} flex-col`}>
                  <div className={`${styles['group_277']} flex-row justify-between`}>
                    <div className={`${styles['section_142']} flex-col`} />
                    <div className={`${styles['section_143']} flex-col`}>
                      <div className={`${styles['block_87']} flex-col`}>
                        <div className={`${styles['box_203']} flex-col`}>
                          <div className={`${styles['block_88']} flex-col`} />
                          <img
                            className={`${styles['image_205']}`}
                            src={
                              require('./assets/img/SketchPngb81cf314c72f891e16f68e8b6ff9671e9c5bb4d9e6ddda9cb2b17c4dc7a3dd51.png')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_125']} flex-row`}>
                    <span className={`${styles['text_589']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_126']} flex-row`}>
                    <span className={`${styles['text_590']}`}>RW-400PRO</span>
                  </div>
                  <div className={`${styles['image-wrapper_136']} flex-row`}>
                    <img
                      className={`${styles['label_196']}`}
                      src={
                        require('./assets/img/SketchPngca71eb7c7924364739af1d22449c33e80260e4c6b0b549d72f81a167aea1684c.png')
                      }
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles['box_204']} flex-row`}>
                <div className={`${styles['box_205']} flex-col`}>
                  <div className={`${styles['group_278']} flex-row justify-between`}>
                    <div className={`${styles['section_144']} flex-col`} />
                    <div className={`${styles['section_145']} flex-col`}>
                      <div className={`${styles['block_89']} flex-col`}>
                        <div className={`${styles['group_279']} flex-col`}>
                          <div className={`${styles['box_206']} flex-col`} />
                        </div>
                        <img
                          className={`${styles['image_206']}`}
                          src={
                            require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['text-wrapper_127']} flex-row`}>
                    <span className={`${styles['text_591']}`}>Air&nbsp;Conditioner</span>
                  </div>
                  <div className={`${styles['text-wrapper_128']} flex-row`}>
                    <span className={`${styles['text_592']}`}>RW-400PRO</span>
                  </div>
                  <div className={`${styles['image-wrapper_137']} flex-row`}>
                    <img
                      className={`${styles['label_197']}`}
                      src={
                        require('./assets/img/SketchPng79f04ba3330c78658776474e35e989ee0106a6c7db6d6729806bf7fc533fd0b2.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-wrapper_129']} flex-col`}>
                  <span className={`${styles['text_593']}`}>设备添加成功</span>
                </div>
              </div>
              <div className={`${styles['image-wrapper_138']} flex-col`}>
                <img
                  className={`${styles['image_207']}`}
                  src={
                    require('./assets/img/SketchPng7039fcbfb5e0a40b2ab383819b059053810e5218d0e62b079b40a5353799bf8d.png')
                  }
                />
              </div>
            </div>
            <span className={`${styles['text_594']}`}>添加设备成功</span>
            <span className={`${styles['text_595']}`}>返回首页，tose提示“添加设备成功”（3s）</span>
          </div>
        </div>
        <div className={`${styles['text-wrapper_130']} flex-row`}>
          <span className={`${styles['text_596']}`}>输入密码</span>
          <span className={`${styles['text_597']}`}>扫描中（30s）</span>
          <span className={`${styles['text_598']}`}>扫描失败</span>
          <span className={`${styles['text_599']}`}>扫描中（30s）</span>
          <span className={`${styles['text_600']}`}>扫描结束（0s）</span>
        </div>
        <div className={`${styles['text-wrapper_131']} flex-row`}>
          <span className={`${styles['text_601']}`}>输入正确密码才能激活下一步按钮</span>
          <span className={`${styles['text_602']}`}>扫描动画自转360度</span>
          <span className={`${styles['paragraph_22']}`}>
            未发现设备，动画停止，
            <br />
            底部出现固定按钮可点击重新扫描
          </span>
          <span className={`${styles['text_603']}`}>已发现设备，设备列表往下叠加</span>
          <span className={`${styles['paragraph_23']}`}>
            1、发现设备列表置顶，扫描动画自动消失
            <br />
            2、已发现设备总数+重新扫描按钮固定底部位置
          </span>
        </div>
        <div className={`${styles['group_280']} flex-row`}>
          <div className={`${styles['group_281']} flex-col`}>
            <div className={`${styles['group_282']} flex-col`}>
              <div className={`${styles['box_207']} flex-row justify-between`}>
                <div className={`${styles['box_208']} flex-col`}>
                  <div className={`${styles['image-wrapper_139']} flex-col`}>
                    <img
                      className={`${styles['label_198']}`}
                      src={
                        require('./assets/img/SketchPng1409f998f44d0e854c5c17c8e89c33a33a0c99ccf742c8c9e8add67068dcff42.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_604']}`}>扫一扫</span>
              </div>
              <div className={`${styles['box_209']} flex-row`}>
                <div className={`${styles['group_283']} flex-col`} />
              </div>
              <div className={`${styles['box_210']} flex-row`}>
                <div className={`${styles['text-group_36']} flex-col justify-between`}>
                  <span className={`${styles['text_605']}`}>扫描设备二维码</span>
                  <span className={`${styles['text_606']}`}>在配件、包装或说明书上查找产品二维码，并将其放在上方相机取景框内</span>
                </div>
              </div>
              <div className={`${styles['box_211']} flex-row`}>
                <div className={`${styles['group_284']} flex-col`}>
                  <span className={`${styles['text_607']}`}>使用相册</span>
                  <img
                    className={`${styles['image_208']}`}
                    src={
                      require('./assets/img/SketchPng5ff8307a45bf76c0f20bcf2653bc85c470332e207bc28491dcf9853525cf5049.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_212']} flex-col`}>
                <div className={`${styles['box_213']} flex-col`} />
              </div>
            </div>
          </div>
          <div className={`${styles['image-wrapper_140']} flex-col`}>
            <img
              className={`${styles['image_209']}`}
              src={
                require('./assets/img/SketchPngf80345dcac41bc1c69d2ba84cf3cd204e418381f804e1877691fe8eadc107eed.png')
              }
            />
          </div>
          <div className={`${styles['group_285']} flex-col`}>
            <span className={`${styles['text_608']}`}>扫一扫失败</span>
            <img
              className={`${styles['image_210']}`}
              src={
                require('./assets/img/SketchPng5ff8307a45bf76c0f20bcf2653bc85c470332e207bc28491dcf9853525cf5049.png')
              }
            />
            <span className={`${styles['text_609']}`}>扫一扫成功</span>
          </div>
          <div className={`${styles['group_286']} flex-col`}>
            <div className={`${styles['box_214']} flex-col`}>
              <div className={`${styles['block_90']} flex-row justify-between`}>
                <div className={`${styles['block_91']} flex-col`}>
                  <div className={`${styles['image-wrapper_141']} flex-col`}>
                    <img
                      className={`${styles['label_199']}`}
                      src={
                        require('./assets/img/SketchPng1409f998f44d0e854c5c17c8e89c33a33a0c99ccf742c8c9e8add67068dcff42.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text_610']}`}>扫一扫</span>
              </div>
              <div className={`${styles['block_92']} flex-row`}>
                <div className={`${styles['block_93']} flex-col`} />
              </div>
              <div className={`${styles['block_94']} flex-row`}>
                <div className={`${styles['text-group_37']} flex-col justify-between`}>
                  <span className={`${styles['text_611']}`}>扫描设备二维码</span>
                  <span className={`${styles['text_612']}`}>在配件、包装或说明书上查找产品二维码，并将其放在上方相机取景框内</span>
                </div>
              </div>
              <div className={`${styles['block_95']} flex-row`}>
                <div className={`${styles['text-wrapper_132']} flex-col`}>
                  <span className={`${styles['text_613']}`}>使用相册</span>
                </div>
              </div>
              <div className={`${styles['block_96']} flex-col`}>
                <div className={`${styles['group_287']} flex-col`} />
                <div className={`${styles['text-wrapper_133']} flex-col`}>
                  <span className={`${styles['text_614']}`}>无效的二维码/条形码</span>
                </div>
                <img
                  className={`${styles['image_211']}`}
                  src={
                    require('./assets/img/SketchPngf9d4b6c528c1d87b7ff808facf79e936c5ce2edea9c8e91ee4a1352fbf0c37ff.png')
                  }
                />
              </div>
            </div>
          </div>
          <div className={`${styles['group_288']} flex-col`}>
            <div className={`${styles['box_215']} flex-row`}>
              <span className={`${styles['text_615']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_196']}`}
                src={
                  require('./assets/img/SketchPng2d8595b94786e7bd31244219811d630a7b4bfc67de4d10c8e9c6a5c99c870d19.png')
                }
              />
              <img
                className={`${styles['thumbnail_197']}`}
                src={
                  require('./assets/img/SketchPngd247105c2afa13c0b3fb0bc5081b4d87b45cdb3950c4aad3a4585fbb87ab633c.png')
                }
              />
              <img
                className={`${styles['image_212']}`}
                src={
                  require('./assets/img/SketchPng7d8df0c72ef4a448de02b0cfd36c91edb97fbd554c7708f1540cdd9699cbb2a0.png')
                }
              />
            </div>
            <div className={`${styles['box_216']} flex-row`}>
              <div className={`${styles['image-text_27']} flex-row justify-between`}>
                <div className={`${styles['group_289']} flex-col`}>
                  <div className={`${styles['image-wrapper_142']} flex-col`}>
                    <img
                      className={`${styles['label_200']}`}
                      src={
                        require('./assets/img/SketchPngbd44937e04ff65935426cd008ed75ce865bbe7bdda0efa29c7fddd98f9f2af65.png')
                      }
                    />
                  </div>
                </div>
                <span className={`${styles['text-group_38']}`}>扫一扫</span>
              </div>
            </div>
            <div className={`${styles['box_217']} flex-row`}>
              <div className={`${styles['image-text_28']} flex-row justify-between`}>
                <div className={`${styles['block_97']} flex-col`}>
                  <div className={`${styles['group_290']} flex-col`}>
                    <div className={`${styles['section_146']} flex-col`}>
                      <div className={`${styles['block_98']} flex-col`} />
                    </div>
                    <img
                      className={`${styles['image_213']}`}
                      src={
                        require('./assets/img/SketchPngb2a0be9d9d539d04772071aae478cdc8f8b6a127a48cd3297cad9ed0c03a4504.png')
                      }
                    />
                  </div>
                </div>
                <div className={`${styles['text-group_39']} flex-col`}>
                  <span className={`${styles['text_616']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_617']}`}>RW-400PRO</span>
                  <span className={`${styles['text_618']}`}>SN.:&nbsp;R26073100012607310001</span>
                </div>
              </div>
              <img
                className={`${styles['thumbnail_198']}`}
                src={
                  require('./assets/img/SketchPng1368adb258a55d38727ecd12f8e470221eb5e1b1195626034ce193f1bb89dfd5.png')
                }
              />
            </div>
            <img
              className={`${styles['image_214']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
          <span className={`${styles['text_619']}`}>点击设备卡片去联网</span>
        </div>
        <div className={`${styles['text-wrapper_134']} flex-row`}>
          <span className={`${styles['text_620']}`}>扫一扫</span>
          <span className={`${styles['text_621']}`}>使用相册</span>
          <span className={`${styles['text_622']}`}>识别失败</span>
          <span className={`${styles['text_623']}`}>识别成功</span>
        </div>
        <div className={`${styles['text-wrapper_135']} flex-row`}>
          <span className={`${styles['paragraph_24']}`}>
            调起本地相机，上下扫动动画，
            <br />
            对准产品二维码进行扫描
            <br />
          </span>
          <span className={`${styles['paragraph_25']}`}>
            1、授权相册权限
            <br />
            2、使用有效的拍摄的设备二维码照片
            <br />
            /或别人分享的设备二维码
            <br />
          </span>
          <span className={`${styles['paragraph_26']}`}>
            1、扫描动画持续进行中
            <br />
            2、出现“无效二维码/条形码”tose提示（3s自动消失）
          </span>
          <span className={`${styles['text_624']}`}>出现对应的设备卡片</span>
        </div>
        <div className={`${styles['group_291']} flex-col`}>
          <div className={`${styles['group_292']} flex-col justify-end`}>
            <span className={`${styles['text_625']}`}>未连接Wi-Fi</span>
            <span className={`${styles['text_626']}`}>手机连接家庭Wi-Fi后才能添加设备</span>
            <div className={`${styles['box_218']} flex-row`}>
              <div className={`${styles['text-wrapper_136']} flex-col`}>
                <span className={`${styles['text_627']}`}>取消</span>
              </div>
              <div className={`${styles['box_219']} flex-col`}>
                <span className={`${styles['text_628']}`}>去连接</span>
                <img
                  className={`${styles['image_215']}`}
                  src={
                    require('./assets/img/SketchPng79cc7fe77837f605ae73be43376e8523b28b412bc42d574f500d8551f5d2c7ba.png')
                  }
                />
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles['image-wrapper_143']} flex-col`}>
          <img
            className={`${styles['image_216']}`}
            src={
              require('./assets/img/SketchPngc15ea1deb6f10874b28ba8766512f8118c2662602c8cf85bd49e349bf9913227.png')
            }
          />
        </div>
        <img
          className={`${styles['image_217']}`}
          src={
            require('./assets/img/SketchPng155e0d79b6df8a38dfba8c3633980afa1946cb8f8eb71417818fba085bf2ca52.png')
          }
        />
        <img
          className={`${styles['image_218']}`}
          src={
            require('./assets/img/SketchPngd1517e70d670964fa3fca6ee7ef40308be24a28a0fc32f9d012815b10f6974d5.png')
          }
        />
        <div className={`${styles['group_293']} flex-col justify-end`}>
          <img
            className={`${styles['label_201']}`}
            src={
              require('./assets/img/SketchPng9ab9cffb2bcb7828df139e15bfb37b05358999bdfe4c527de896160c2bc31e16.png')
            }
          />
          <span className={`${styles['text_629']}`}>删除设备</span>
          <img
            className={`${styles['image_219']}`}
            src={
              require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
            }
          />
        </div>
        <img
          className={`${styles['image_220']}`}
          src={
            require('./assets/img/SketchPng88f5dcad7ca6c467fe2e299bbd73313e230b8cc313561442a30035a755962128.png')
          }
        />
        <img
          className={`${styles['image_221']}`}
          src={
            require('./assets/img/SketchPng073b676d63c173c988446205dec8fdb2c28e1971f9d72106e77f3c65e0e08b70.png')
          }
        />
        <img
          className={`${styles['image_222']}`}
          src={
            require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
          }
        />
        <img
          className={`${styles['image_223']}`}
          src={
            require('./assets/img/SketchPngc581ffe03e94d2618c5903380415ad3e5fe82d35e18b9af650469816c892a736.png')
          }
        />
        <img
          className={`${styles['image_224']}`}
          src={
            require('./assets/img/SketchPngf197ece6a0e87b517fce0cf2efa86c157c30069c09400da55f497e0eb2675ad5.png')
          }
        />
        <img
          className={`${styles['image_225']}`}
          src={
            require('./assets/img/SketchPng1f6940b6ca82c85fbb5333000f3aa17a7545e83a72cae927c7ac37b0d309abd3.png')
          }
        />
        <img
          className={`${styles['image_226']}`}
          src={
            require('./assets/img/SketchPngabb01981c0d7530c516305eea019722abceb2d9b91a293528196bc7ab589d31c.png')
          }
        />
      </div>
    );
  }
}
export default DDS_lanhupage_0;
