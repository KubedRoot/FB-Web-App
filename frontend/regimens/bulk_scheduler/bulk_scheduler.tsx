import React from "react";
import { BulkEditorProps } from "./interfaces";
import { WeekGrid } from "./week_grid";
import { setTimeOffset, setSequence } from "./actions";
import {
  BlurableInput, Row, Col, FBSelect, DropDownItem, NULL_CHOICE,
} from "../../ui";
import moment from "moment";
import { isString } from "lodash";
import { betterCompact, bail } from "../../util";
import { msToTime, timeToMs } from "./utils";
import { t } from "../../i18next_wrapper";

const BAD_UUID = "WARNING: Not a sequence UUID.";

export class BulkScheduler extends React.Component<BulkEditorProps, {}> {
  selected = (): DropDownItem => {
    const s = this.props.selectedSequence;
    return (s?.body.id)
      ? { label: s.body.name, value: s.uuid }
      : NULL_CHOICE;
  };

  all = (): DropDownItem[] => {
    return betterCompact(this.props.sequences.map(x => {
      if (x.body.id) {
        return { value: x.uuid, label: x.body.name };
      }
    }));
  };

  commitChange = (uuid: string) => {
    this.props.dispatch(setSequence(uuid));
  };

  onChange = (event: DropDownItem) => {
    const uuid = event.value;
    isString(uuid) ? this.commitChange(uuid) : bail(BAD_UUID);
  };

  SequenceSelectBox = () =>
    <Col xs={6}>
      <div className={"sequence-select-box"}>
        <label>{t("Sequence")}</label>
        <FBSelect onChange={this.onChange}
          selectedItem={this.selected()}
          list={this.all()} />
      </div>
    </Col>;

  TimeSelection = () =>
    <Col xs={6}>
      <div className={"time-selection"}>
        <label>{t("Time")}</label>
        <i className="fa fa-clock-o" onClick={() =>
          this.props.dispatch(setTimeOffset(timeToMs(
            moment().add(3, "minutes").format("HH:mm"))))} />
        <BlurableInput type="time"
          value={msToTime(this.props.dailyOffsetMs)}
          onCommit={({ currentTarget }) => {
            this.props.dispatch(setTimeOffset(timeToMs(currentTarget.value)));
          }} />
      </div>
    </Col>;

  render() {
    const { dispatch, weeks } = this.props;
    return <div className="bulk-scheduler-content">
      <Row>
        <this.SequenceSelectBox />
        <this.TimeSelection />
      </Row>
      <WeekGrid weeks={weeks} dispatch={dispatch} />
    </div>;
  }
}
