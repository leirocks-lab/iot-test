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
        <div className={`${styles['box_1']} flex-row`}>
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['box_2']} flex-col`}>
            <div className={`${styles['group_1']} flex-row`}>
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
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/13976bafd767411f880506f80c689bdd_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>示例</span>
                <span className={`${styles['text_3']}`}>常见问题</span>
              </div>
            </div>
            <span className={`${styles['text_4']}`}>无法使用Alexa控制我的设备？</span>
            <span className={`${styles['paragraph_1']}`}>
              请检查:
              <br />
              1.确保您的设备已连接到ZAFRO。如果连接失败，请检查您的设备是否已插入并且您的移动设备是否可以访问互联网。
              <br />
              2.确保您的Alexa已连接到互联网。
              <br />
              3.确保您的ZAFRO账号已授权至Alexa。授权账号后，在ZAFROApp中新添加的设备将自动同步至AlexaApp。如依旧找不到设备，可以尝试重新连接账号至AlexaApp。
              <br />
              4.该设备支持多语言语音命令。请在ZAFROApp内，检查设备的语音指令列表中的可用语言，确保您的AmazonEcho语言在此列表中，并检查AlexaApp中的设备设置里的语言设置
            </span>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
