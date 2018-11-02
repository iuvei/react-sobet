/**
 * Created by Orange on 2018-10-05 10:26:44.
 */

import React from 'react';
import { inject, observer } from 'mobx-react';
import './lotteryHead.styl';
import Countdown from '../../../../components/Countdown';
import FixedCountdownTip from '../FixedCountdownTip';
import Opencode from './Opencode';

@inject('lotteryStore')
@observer
class LotteryHead extends React.Component {
    render() {
        const { emptyOpencode, lotteryType, lotteryCode, currentIssue, countdown, updateIssue, opencodeArr, openIssue } = this.props.lotteryStore;

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
                    {
                        emptyOpencode ? null : (
                            <React.Fragment>
                                <div className="fr head-right-opencode" lottery-type={lotteryType}>
                                    <Opencode {...{ opencodeArr, lotteryType, lotteryCode }} />
                                </div>
                                <div className="fr head-right-issue">
                                    <div className="head-right-issue-top">
                                        第<em className="open-issue">{openIssue}</em>期
                                    </div>
                                    <div className="head-right-issue-bottom">开奖号码</div>
                                </div>
                            </React.Fragment>
                        )
                    }

                </div>
            </div>
        );
    }
}

export default LotteryHead;