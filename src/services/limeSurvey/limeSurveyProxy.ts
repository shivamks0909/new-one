import { config } from "../../config";

interface RPCRequest {
  method: string;
  params: any[];
  id: number;
}

interface RPCResponse {
  result?: any;
  error?: { code: number; message: string };
  id: number;
}

export class LimeSurveyProxy {
  private rpcUrl: string;
  private username: string;
  private password: string;
  private sessionKey: string | null = null;
  private sessionExpiresAt: number = 0;
  private requestId = 1;

  constructor() {
    this.rpcUrl = config.limeSurveyRpcUrl || "http://localhost:8080/index.php/admin/remotecontrol/handle";
    this.username = config.limeSurveyUsername || "admin";
    this.password = config.limeSurveyPassword || "admin123";
  }

  private async ensureSession(): Promise<string> {
    if (this.sessionKey && Date.now() < this.sessionExpiresAt - 60000) {
      return this.sessionKey;
    }

    const response = await this.call("get_session_key", [this.username, this.password]);
    if (response.error) {
      throw new Error(`LS auth failed: ${response.error.message}`);
    }

    this.sessionKey = response.result;
    this.sessionExpiresAt = Date.now() + 3600000; // 1 hour default
    return this.sessionKey;
  }

  private async call(method: string, params: any[]): Promise<RPCResponse> {
    const sessionKey = method === "get_session_key" ? null : await this.ensureSession();

    const rpcParams = sessionKey ? [sessionKey, ...params] : params;

    const body: RPCRequest = {
      method,
      params: rpcParams,
      id: this.requestId++,
    };

    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as RPCResponse;
    return data;
  }

  // ─── Survey Management ────────────────────────────────────

  async createSurvey(title: string, language = "en", format = "G"): Promise<number> {
    const response = await this.call("add_survey", [0, title, language, format]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  async deleteSurvey(surveyId: number): Promise<void> {
    const response = await this.call("delete_survey", [surveyId]);
    if (response.error) throw new Error(response.error.message);
  }

  async getSurveyProperties(surveyId: number, fields?: string[]): Promise<any> {
    const response = await this.call("get_survey_properties", [surveyId, fields || []]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  async setSurveyProperties(surveyId: number, properties: Record<string, any>): Promise<void> {
    const response = await this.call("set_survey_properties", [surveyId, properties]);
    if (response.error) throw new Error(response.error.message);
  }

  async activateSurvey(surveyId: number): Promise<void> {
    const response = await this.call("activate_survey", [surveyId]);
    if (response.error) throw new Error(response.error.message);
  }

  async deactivateSurvey(surveyId: number): Promise<void> {
    const response = await this.call("deactivate_survey", [surveyId]);
    if (response.error) throw new Error(response.error.message);
  }

  async getSurveyList(): Promise<any[]> {
    const response = await this.call("get_survey_list", []);
    if (response.error) throw new Error(response.error.message);
    return response.result || [];
  }

  // ─── Question Groups ──────────────────────────────────────

  async addGroup(surveyId: number, title: string, description = "", order = 1, randomizationGroup = "", relevance = "1"): Promise<number> {
    const response = await this.call("add_group", [surveyId, title, description, order, randomizationGroup, relevance]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  async deleteGroup(surveyId: number, groupId: number): Promise<void> {
    const response = await this.call("delete_group", [surveyId, groupId]);
    if (response.error) throw new Error(response.error.message);
  }

  async getGroupProperties(surveyId: number, groupId: number, fields?: string[]): Promise<any> {
    const response = await this.call("get_group_properties", [surveyId, groupId, fields || []]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  async setGroupProperties(surveyId: number, groupId: number, properties: Record<string, any>): Promise<void> {
    const response = await this.call("set_group_properties", [surveyId, groupId, properties]);
    if (response.error) throw new Error(response.error.message);
  }

  async moveGroups(surveyId: number, start: number, end: number, target: number): Promise<void> {
    const response = await this.call("move_groups", [surveyId, start, end, target]);
    if (response.error) throw new Error(response.error.message);
  }

  // ─── Questions ────────────────────────────────────────────

  async addQuestion(
    surveyId: number,
    questionText: string,
    questionType: string,
    code: string,
    groupId: number,
    options: {
      mandatory?: string;
      relevance?: string;
      other?: string;
      same_default?: string;
      questionOrder?: number;
      questionThemeName?: string;
    } = {}
  ): Promise<number> {
    const params = [
      surveyId,
      questionText,
      questionType,
      code,
      groupId,
      options.mandatory ?? "N",
      options.relevance ?? "1",
      options.other ?? "N",
      options.same_default ?? "0",
      options.questionOrder ?? 0,
      options.questionThemeName ?? "fruity",
    ];

    const response = await this.call("add_question", params);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  async deleteQuestion(surveyId: number, questionId: number): Promise<void> {
    const response = await this.call("delete_question", [surveyId, questionId]);
    if (response.error) throw new Error(response.error.message);
  }

  async getQuestionProperties(surveyId: number, questionId: number, fields?: string[], language?: string): Promise<any> {
    const response = await this.call("get_question_properties", [surveyId, questionId, fields || [], language || "en"]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  async setQuestionProperties(surveyId: number, questionId: number, properties: Record<string, any>, language = "en"): Promise<void> {
    const response = await this.call("set_question_properties", [surveyId, questionId, properties, language]);
    if (response.error) throw new Error(response.error.message);
  }

  async moveQuestions(surveyId: number, start: number, end: number, target: number): Promise<void> {
    const response = await this.call("move_questions", [surveyId, start, end, target]);
    if (response.error) throw new Error(response.error.message);
  }

  async copyQuestion(surveyId: number, questionId: number, targetGroupId: number): Promise<number> {
    const response = await this.call("copy_question", [surveyId, questionId, targetGroupId]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  // ─── Preview & Statistics ─────────────────────────────────

  async getSurveyStatistics(surveyId: number, summary = false, groupIds?: number[], questionIds?: number[], language?: string): Promise<any> {
    const response = await this.call("get_statistics", [surveyId, summary, groupIds || [], questionIds || [], language || "en", ""]);
    if (response.error) throw new Error(response.error.message);
    return response.result;
  }

  // ─── Utility ──────────────────────────────────────────────

  async releaseSession(): Promise<void> {
    if (this.sessionKey) {
      await this.call("release_session_key", [this.sessionKey]);
      this.sessionKey = null;
      this.sessionExpiresAt = 0;
    }
  }

  getSurveyUrl(surveyId: number, language = "en"): string {
    const baseUrl = config.limeSurveyPublicUrl || "http://localhost:8080";
    return `${baseUrl}/index.php/survey/index/sid/${surveyId}/lang/${language}`;
  }
}

export const limeSurveyProxy = new LimeSurveyProxy();
