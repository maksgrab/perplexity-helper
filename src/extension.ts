import * as vscode from 'vscode';
const fetch = require('node-fetch');

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const outputChannel = vscode.window.createOutputChannel("Perplexity Helper");
outputChannel.appendLine("Preparing to send request to Perplexity API");

export function activate(context: vscode.ExtensionContext) {
  let setApiTokenDisposable = vscode.commands.registerCommand('perplexityHelper.setApiToken', async () => {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Perplexity API key',
      ignoreFocusOut: true,
      password: true
    });

    if (apiKey) {
      await context.secrets.store('perplexityApiKey', apiKey);
      vscode.window.showInformationMessage('Perplexity API key saved!');
    } else {
      vscode.window.showWarningMessage('No API key entered.');
    }
  });
  context.subscriptions.push(setApiTokenDisposable);
  
  const handler: vscode.ChatRequestHandler = async (
    request,
    _context,
    stream,
    _token
  ) => {
    // Retrieve the API key securely  
    const apiKey = await context.secrets.get('perplexityApiKey');
    if (!apiKey) {
      stream.markdown('Please set your Perplexity API key using the command palette.');
      return;
    }
  
    const payload = {
      search_mode: "web",
      reasoning_effort: "medium",
      temperature: 0.2,
      top_p: 0.9,
      return_images: false,
      return_related_questions: false,
      top_k: 0,
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 0,
      web_search_options: { search_context_size: "low" },
      model: "sonar",
      messages: [
        { content: "You are a helpful coding assistant.", role: "system" },
        { content: request.prompt, role: "user" }
      ]
    };

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      stream.markdown('Error contacting Perplexity API.');
      return;
    }
    
    const data = await response.json();

    const answer = data.choices?.[0]?.message?.content || 'No response.';
    stream.markdown(answer);
  };

  const participant = vscode.chat.createChatParticipant('perplexity-helper', handler);
  context.subscriptions.push(participant);
}