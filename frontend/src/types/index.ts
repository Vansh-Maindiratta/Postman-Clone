export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type Theme = 'light' | 'dark';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type QueryParameter = KeyValue;
export type Header = KeyValue;

export type BodyType = 'none' | 'json' | 'text' | 'form';

export interface RequestBody {
  type: BodyType;
  /** Raw editor contents for the json and text types. */
  text: string;
  /** Fields for the form data type. */
  form: KeyValue[];
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface AuthConfig {
  type: AuthType;
  token: string;
  username: string;
  password: string;
  keyName: string;
  keyValue: string;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: QueryParameter[];
  headers: Header[];
  body: RequestBody;
  auth: AuthConfig;
  collectionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  requests: ApiRequest[];
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  duration: number;
  contentType: string;
}

export interface RequestHistory {
  id: string;
  time: number;
  request: ApiRequest;
}
