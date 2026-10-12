package com.clinicar.backend.model;
import java.time.LocalDate;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity
@Table(name = "fornecedor", uniqueConstraints = @UniqueConstraint(name = "uk_fornecedor_email", columnNames = "email"))
@Getter @Setter
public class Fornecedor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private boolean ativo = true;
    private String cnpj;
    private String razaoSocial;
    private String nomeFantasia;
    private String itemFornecido;
    private String telefone;
    private String email;
    private LocalDate fundacao;
    private String cep;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String complementoEndereco;
    private String numeroEndereco;
}
