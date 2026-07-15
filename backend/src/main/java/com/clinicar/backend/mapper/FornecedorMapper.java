package com.clinicar.backend.mapper;
import com.clinicar.backend.dto.FornecedorResponse;
import com.clinicar.backend.model.Fornecedor;
import org.springframework.stereotype.Component;
import java.util.List;
@Component
public class FornecedorMapper {
    public FornecedorResponse toResponse(Fornecedor fornecedor) {
        if (fornecedor == null) {
            return null;
        }
        FornecedorResponse response = new FornecedorResponse();
        response.setId(fornecedor.getId());
        response.setCnpj(fornecedor.getCnpj());
        response.setRazaoSocial(fornecedor.getRazaoSocial());
        response.setNomeFantasia(fornecedor.getNomeFantasia());
        response.setItemFornecido(fornecedor.getItemFornecido());
        response.setTelefone(fornecedor.getTelefone());
        response.setEmail(fornecedor.getEmail());
        response.setFundacao(fornecedor.getFundacao());
        response.setCep(fornecedor.getCep());
        response.setLogradouro(fornecedor.getLogradouro());
        response.setBairro(fornecedor.getBairro());
        response.setCidade(fornecedor.getCidade());
        response.setEstado(fornecedor.getEstado());
        response.setComplementoEndereco(fornecedor.getComplementoEndereco());
        response.setNumeroEndereco(fornecedor.getNumeroEndereco());
        return response;
    }

    public List<FornecedorResponse> toResponseList(List<Fornecedor> fornecedores) {
        return fornecedores.stream().map(this::toResponse).toList();
    }
}