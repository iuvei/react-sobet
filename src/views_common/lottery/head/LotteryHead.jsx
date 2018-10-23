/**
 * Created by Orange on 2018-10-05 10:26:44.
 */

import React from 'react';
import { inject, observer } from 'mobx-react';
import './lotteryHead.styl';
import Countdown from '../../../components/Countdown';
import FixedCountdownTip from '../FixedCountdownTip';

@inject('lotteryStore')
@observer
class LotteryHead extends React.Component {
    render() {
        const { lotteryType, lotteryCode, lotteryCn, currentIssue, countdown, updateIssue, opencodeArr, openIssue } = this.props.lotteryStore;
        const Opencode = ({ codeArr, lotteryType, lotteryCode }) => {
            return codeArr.map((v, i) => {
                switch (lotteryType) {
                    case 'ssc':
                    case '3d':
                    case '11x5':
                        return <span key={i} className="opencode">{v}</span>;
                    case 'k3':
                    case 'pk10':
                        return <span key={i} className="opencode" code={v} lottery-type={lotteryType}></span>;
                    case 'lhc':
                        return <span key={i} className={`opencode ${i === codeArr.length - 1 ? 'tm' : ''}`} code={v} lottery-type={lotteryType}></span>;
                    default:
                        return <span key={i} className="opencode" lottery-type={lotteryType} lottery-code={lotteryCode}>{v}</span>;
                }
            });
        };
        return (
            <div className="clearfix lottery-head-wrapper">
                <FixedCountdownTip />
                <div className="fl head-left">
                    <i className="lottery-logo" lt={lotteryCode.toLowerCase()}></i>
                </div>
                <div className="fl clearfix head-center">
                    <div className="fl head-center-issue">
                        <div className="head-center-issue-top">
                            第<em className="current-issue">{currentIssue}</em>期
                        </div>
                        <div className="head-center-issue-bottom">投注截止还有</div>
                    </div>
                    <div className="fr head-center-clock">
                        {
                            countdown === '等待开售' ? <span className="wait-to-sell">等待开售</span> : <Countdown className="issue-countdown" count={countdown} callback={updateIssue} />
                        }
                    </div>
                </div>
                <div className="fr clearfix head-right">
                    <div className="fr head-right-opencode">
                        <Opencode codeArr={opencodeArr} lotteryType={lotteryType} lotteryCode={lotteryCode} />
                    </div>
                    <div className="fr head-right-issue">
                        <div className="head-right-issue-top">
                            第<em className="open-issue">{openIssue}</em>期
                        </div>
                        <div className="head-right-issue-bottom">开奖号码</div>
                    </div>
                </div>
            </div>
        );
    }
}

export default LotteryHead;